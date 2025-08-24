import NavigationChild from "../components/NavigationChild";
export default function TempahLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
    <NavigationChild/>
    <div className="min-h-screen bg-gray-100 py-20">
      {children}
    </div>
    </>
  );
}
