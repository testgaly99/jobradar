import BewerbungInhalt from "./inhalt";

export default async function Seite({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fehler?: string }> }) {
  const [{ id }, { fehler }] = await Promise.all([params, searchParams]);
  return <BewerbungInhalt id={id} fehler={fehler} />;
}
