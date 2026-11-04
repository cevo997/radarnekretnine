import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Xpert Radar | Oglasi vlasnika',description:'Radni prostor NekretnineXpert za pronalaženje i obradu vlasničkih oglasa.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="sr-Latn"><body>{children}</body></html>}
