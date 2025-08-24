
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "HEBAHAN | UTC PERLIS",
    description: "Hebahan",
};

export default function HebahanLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="">
            <main className="">
                {children}
            </main>
        </div>
    );
}