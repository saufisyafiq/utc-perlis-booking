import Metadata from "next/head";
import NavigationChild from "../../components/NavigationChild";

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <Metadata>
                <title>UTC PERLIS | Servis</title>
                <meta name="description" content="UTC PERLIS | Servis" />
            </Metadata>
            <NavigationChild />
            {children}
        </>
    );
}