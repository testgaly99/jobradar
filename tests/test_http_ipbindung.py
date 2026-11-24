"""Synthetische Antworten an der Socket-Grenze des privaten HTTP-Transports."""
from io import BytesIO
import socket
import ssl

import pytest
import requests

from scraper import http


HOST = "stellen.example.invalid"
BASIS = "https://" + HOST
IP = "93.184.216.34"


@pytest.fixture
def transport(monkeypatch):
    ziele, tls, anfragen, antworten = [], [], [], []
    monkeypatch.setattr(http, "_robots", {BASIS: None})
    monkeypatch.setattr(http, "_zuletzt", {})
    monkeypatch.setattr(http, "PAUSE", 0)

    class ErsatzSocket:
        def __init__(self, *args):
            pass

        def connect(self, adresse):
            ziele.append(adresse)

        def settimeout(self, timeout):
            assert 0 < timeout <= http.TIMEOUT

        def setsockopt(self, *args):
            pass

        def sendall(self, daten):
            anfragen.append(daten)

        def makefile(self, *args):
            return BytesIO(antworten.pop(0))

        def close(self):
            pass

    def tls_handshake(kontext, sock, *, server_hostname):
        assert kontext.check_hostname and kontext.verify_mode == ssl.CERT_REQUIRED
        tls.append(server_hostname)
        return sock

    monkeypatch.setattr(socket, "socket", ErsatzSocket)
    monkeypatch.setattr(ssl.SSLContext, "wrap_socket", tls_handshake)
    return ziele, tls, anfragen, antworten


def dns(monkeypatch, adressfolgen):
    hosts = []

    def aufloesen(host, port, *args, **kwargs):
        assert port == 443
        adressen = adressfolgen[len(hosts)]
        hosts.append(host)
        return [(socket.AF_INET6 if ":" in ip else socket.AF_INET,
                 socket.SOCK_STREAM, socket.IPPROTO_TCP, "", (ip, 443))
                for ip in adressen]

    monkeypatch.setattr(socket, "getaddrinfo", aufloesen)
    return hosts


def test_verbindet_nur_gepruefte_ip_mit_zertifikatsnamen_und_hostheader(monkeypatch, transport):
    ziele, tls, anfragen, antworten = transport
    hosts = dns(monkeypatch, [[IP], ["127.0.0.1"]])
    antworten.append(b'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{"ok":true}')
    with http.zielschutz(lambda url: None, gepinnt=True):
        with http.hole(BASIS + "/stellen?q=Köln") as antwort:
            assert antwort.json() == {"ok": True}
    assert hosts == [HOST]
    assert ziele == [(IP, 443)]
    assert tls == [HOST]
    assert anfragen[0].startswith(b"GET /stellen?q=K%C3%B6ln HTTP/1.1\r\n")
    assert f"\r\nHost: {HOST}\r\n".encode() in anfragen[0]


@pytest.mark.parametrize("adressen", [
    [], ["127.0.0.1"], [IP, "10.0.0.1"], ["224.0.0.1"], ["::ffff:127.0.0.1"], ["fe80::1"],
])
def test_jede_adresse_muss_vor_verbindungsaufbau_oeffentlich_sein(monkeypatch, transport, adressen):
    dns(monkeypatch, [adressen])
    with http.zielschutz(lambda url: None, gepinnt=True), pytest.raises(ValueError):
        http.hole(BASIS + "/stellen")
    assert transport[0] == []


@pytest.mark.parametrize("url", [
    "http://" + HOST, BASIS + ":8443", "https://name:pass@" + HOST,
])
def test_nur_https_443_ohne_zugangsdaten(monkeypatch, transport, url):
    hosts = dns(monkeypatch, [])
    with http.zielschutz(lambda url: None, gepinnt=True), pytest.raises((ValueError, http.RobotsNichtErreichbar)):
        http.hole(url)
    assert not hosts and not transport[0]


def test_ipv6_und_fehlerstatus_bleiben_lesbar(monkeypatch, transport):
    ip = "2606:4700:4700::1111"
    dns(monkeypatch, [[ip]])
    transport[3].append(b"HTTP/1.1 429 Too Many Requests\r\nRetry-After: 30\r\n\r\nLimit")
    with http.zielschutz(lambda url: None, gepinnt=True), pytest.raises(requests.HTTPError) as fehler:
        http.hole(BASIS)
    assert transport[0] == [(ip, 443)]
    assert fehler.value.response.status_code == 429
    assert fehler.value.response.headers["retry-after"] == "30"
    assert fehler.value.response.text == "Limit"


def test_robots_und_seitenweiterleitung_haben_eigene_ippruefung(monkeypatch, transport):
    ziele, tls, anfragen, antworten = transport
    http._robots.clear()
    hosts = dns(monkeypatch, [[IP], [IP], [IP], ["127.0.0.1"]])
    antworten.extend([
        b"HTTP/1.1 302 Found\r\nLocation: https://regeln.example.invalid/robots\r\n\r\n",
        b"HTTP/1.1 200 OK\r\n\r\nUser-agent: *\nAllow: /\n",
        b"HTTP/1.1 302 Found\r\nLocation: https://ziel.example.invalid/jobs\r\n\r\n",
    ])
    with http.zielschutz(lambda url: None, gepinnt=True), pytest.raises(http.RobotsNichtErreichbar):
        http.hole(BASIS + "/stellen")
    assert hosts == [HOST, "regeln.example.invalid", HOST, "ziel.example.invalid"]
    assert tls == hosts[:3]
    assert ziele == [(IP, 443)] * 3
    assert len(anfragen) == 3


def test_groessenlimit_ohne_laengenheader_und_kontext_nach_fehler(monkeypatch, transport):
    dns(monkeypatch, [[IP]])
    monkeypatch.setattr(http, "MAX_ANTWORT_BYTES", 3, raising=False)
    transport[3].append(b"HTTP/1.1 200 OK\r\n\r\n1234")
    with http.zielschutz(lambda url: None, gepinnt=True), pytest.raises(ValueError):
        http.hole(BASIS)
    standard = requests.Response()
    standard.status_code = 200
    monkeypatch.setattr(requests, "get", lambda *args, **kw: standard)
    assert http.hole(BASIS) is standard
