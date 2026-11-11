export default function Layout({ children, fenster }: { children: React.ReactNode; fenster: React.ReactNode }) {
  return <>{children}{fenster}</>;
}
