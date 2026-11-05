# Xpert Radar — Vercel verzija

Gotova aplikacija za Vercel: Next.js, zasebna prijava agencije, udaljena libSQL/Turso baza. ChatGPT nalog nije potreban za korisnike aplikacije. Oglasi i pravila pretrage su preneti iz postojeće verzije. Prethodna ChatGPT aplikacija ostaje odvojena; posle prelaska koristite novi Vercel link.

## Postavljanje bez programiranja

1. Raspakujte ZIP. Folder **xpert-radar-vercel** je projekat. Datoteka **PRENOS-PODATAKA.json** je zasebna rezervna kopija sa oglasima i beleškama.
2. U GitHub-u napravite **privatan repozitorijum**. Učitajte sadržaj foldera projekta. U korenu repozitorijuma moraju biti `package.json`, `package-lock.json`, `app`, `lib` i ostali fajlovi projekta. Nemojte učitati rezervnu kopiju podataka u GitHub.
3. Na https://vercel.com/new povežite i uvezite taj repozitorijum. Framework je **Next.js**. Ako baza još nije spremna, prva izgradnja može da prođe i bez nje; prijava će jasno tražiti podešavanje.
4. Povežite **libSQL bazu** u Turso nalogu (https://app.turso.tech). Koristite libSQL engine kompatibilan sa `@libsql/client`, a ne novu Turso engine bazu za koju je potreban drugi drajver. Kopirajte URL baze i token u Vercel → Project → Settings → Environment Variables.
5. Dodajte promenljive iz tabele ispod, pa pokrenite **Redeploy**. Dodavanje promenljivih samo po sebi ne menja već objavljenu verziju.
6. Otvorite novi Vercel link i prijavite se. Otvorite zupčanik → **Prenos podataka i rezervna kopija** → učitajte **PRENOS-PODATAKA.json**. Kopija se prihvata samo u praznu bazu; nema prepisivanja postojeće baze i beleški. Automatska pretraga je pauzirana na praznoj bazi da uvoz može da se završi.
7. Posle uvoza proverite Internet pretragu u podešavanjima. Ako niste dodali `TAVILY_API_KEY` na Vercelu, unesite svoj postojeći Tavily ključ u aplikaciji. Taj ključ nije uključen u ZIP i ne prenosi se rezervnom kopijom.

## Obavezne promenljive na Vercelu

| Naziv | Vrednost |
|---|---|
| `TURSO_DATABASE_URL` | URL vaše libSQL baze, oblika `libsql://…turso.io` |
| `TURSO_AUTH_TOKEN` | Token te baze |
| `APP_USERNAME` | Korisničko ime agencije, npr. `xpert` |
| `APP_PASSWORD` | Vaša nova lozinka od najmanje 12 znakova |
| `SESSION_SECRET` | Nasumičan tajni niz od najmanje 32 znaka |
| `TAVILY_API_KEY` | Postojeći ključ za internet pretragu; alternativno unesite kroz podešavanja aplikacije |

Vrednosti ne počinju sa `NEXT_PUBLIC_`. Ne stavljajte ih u GitHub. `node scripts/create-secrets.mjs` generiše nasumične predloge lokalno; vrednosti sačuvajte u Vercel podešavanja. Nema zajedničke fabričke lozinke. Promena lozinke ili tajne sesije prekida ranije prijave.

## Pretraga i zakazivanje

- Klik „Osveži oglase“ proverava uključene izvore. Dok je aplikacija otvorena, provera se pokreće približno svakih pet minuta.
- Podaci su u udaljenoj bazi, pa se isti oglasi, statusi i beleške vide na svim računarima.
- Za rad sa zatvorenom aplikacijom potreban je zaseban raspored. Paket podrazumevano ne uključuje cron, da izgradnja ne bi pala na Hobby planu.
- Vercel Hobby dozvoljava ugrađeni cron jednom dnevno. Za ugrađeni raspored na pet minuta potreban je odgovarajući plaćeni plan. Ako ga imate, zamenite sadržaj `vercel.json` sadržajem `deployment/vercel-pro-cron.json`, dodajte `CRON_SECRET` od najmanje 32 nasumična znaka i ponovite Deploy.
- Alternativno: postojeći spoljašnji zakazivač poziva `GET https://VAS-DOMEN/api/cron` sa zaglavljem `Authorization: Bearer VAS_CRON_SECRET`, ili izvršava `scripts/cron-radar.mjs`. Token se postavlja u tajne zakazivača. Pozivi bez tokena se odbijaju.
- Dužina funkcije je podešena na 300 sekundi. Proverite ograničenja vašeg Vercel plana ako duga provera bude prekinuta.
- Pretraživač i baza koriste kvotu vaših povezanih naloga. Portali mogu blokirati pristup ili odložiti indeksiranje; ne garantuje se trenutna i potpuna pokrivenost svih oglasa. Facebook zahteva izabrane javne stranice.

## Lokalno pokretanje i Git

Potrebni su Node.js 22+ i npm. Kopirajte `.env.example` u `.env.local` i popunite vrednosti.

```
npm ci
npm run dev
```

Provere:

```
npm test
npm run check
npm run build
```

Prvi upload preko Git-a (iz foldera projekta, uz vaš privatni GitHub URL):

```
git init
git add .
git commit -m "Prepare Xpert Radar for Vercel"
git branch -M main
git remote add origin VAS_PRIVATNI_GITHUB_URL
git push -u origin main
```

Za naredne verzije:

```
git add .
git commit -m "Update Xpert Radar"
git push
```

Vercel zatim automatski gradi novu verziju povezanog repozitorijuma. Fajl sa prenosom podataka ostaje izvan projekta.

## Zvanična dokumentacija

- Turso / Vercel: https://docs.turso.tech/integrations/vercel
- Vercel promenljive: https://vercel.com/docs/environment-variables
- Cron ograničenja: https://vercel.com/docs/cron-jobs/usage-and-pricing

## Šta je provereno

U ovoj verziji proverena je produkcijska Next.js izgradnja. Automatski testovi nisu pokretani, po zahtevu korisnika. Rezultati ranijih čitanja javnih oglasa navedeni su ispod. Objavljivanje na vaš Vercel nalog i povezivanje stvarne udaljene baze obavljate kroz korake iznad.

Ako Vercel traži svoju prijavu pre nego što prikaže aplikaciju, proverite Project → Settings → Deployment Protection za produkcijski domen. Pristup podacima aplikacije štite korisničko ime i lozinka postavljeni iznad. Promene na staroj ChatGPT verziji posle izvoza nisu automatski sinhronizovane sa novom bazom; rezervna kopija predstavlja presek u trenutku izvoza.

## Obrada svih izvora

Svaki uključeni oglasnik sada ima pokušaj direktnog čitanja dostupnih javnih stranica i dopunsku proveru preko Tavily. Oglasi.rs i Nekretnine.rs zadržavaju posebne parsere; ostali koriste ograničeno čitanje linkova i proveru detalja. Direktno čitanje može biti blokirano ili nedostupno u produkcijskoj mreži — nova implementacija ne ukida zabrane portala. HTTP 403/429 izaziva pauzu direktnog pristupa na šest sati; internet provera ostaje aktivna.

- KP: vlasničke kartice, cene i površine, relativni datumi i rotacija narednih stranica.
- 4zida: vlasničke kartice, različite kategorije prodaje i rotacija narednih stranica.
- Halo: kartice sa zasebnom cenom, datumom i vlasnikom; pokušaj naredne stranice uz otkrivanje ponovljenih rezultata.
- Nekretnine.rs: pojedinačni detalji sa oznakom Privatno lice i praćenje uočenih `pag` linkova. Direktan pristup se može odbiti.
- NadjiDom: direktne javne liste i detalji kada su dostupni, podrška `page` linkovima i odbacivanje jasno agencijskih kartica pre otvaranja detalja.
- Mojtrg: oba dostupna prikaza liste; privatni oglašivač se potvrđuje u pojedinačnom oglasu. Javno prikazani telefoni mogu se preuzeti.
- Imovina.net: direktne javne liste/detalji i ciljana internet pretraga; oglasi agencija ne postaju vlasnički kontakti.
- Facebook: isključivo izabrane javne stranice za Novi Sad; dve stranice za čitanje rotiraju se kroz odabrane, uz upite za sve odabrane. Grupe, Marketplace i privatni profili ostaju isključeni.

Neobrađeni linkovi čuvaju se u tabeli `crawl_frontier`. Obrada se raspoređuje po izvorima, pa se nastavlja sledećim pokretanjem. Detalji uspešno pročitanih linkova proveravaju se ponovo najranije posle 24 sata, a nedostupnih posle 30 minuta. Sveže javne kartice i dalje se čitaju u svakom prolazu. Broj zahteva i trajanje su ograničeni zbog vremenskog ograničenja Vercel funkcije i kvote servisa.

Oglas ulazi u vlasničke kontakte samo posle čitanja detalja ili jasno označene javne kartice. Rezultat internet pretrage sam po sebi ostaje za proveru. Nedostajući datum se ne izmišlja. Ako detalj ne vrati cenu, ranija cena se čuva uz oznaku da je poslednja poznata. Izričito odbijanje saradnje sa agencijama označava kontakt kao Ne želi saradnju. Statusi i beleške se čuvaju.

Unos pojedinačnog linka i preuzimanje javnog telefona dostupni su za sve podržane portale. Nema otključavanja skrivenih brojeva. Pozadinski rad zahteva posebno povezan serverski raspored; cron endpoint sam po sebi nije aktivan raspored.

Automatski testovi nisu pokretani, po zahtevu korisnika. Produkcijska izgradnja prolazi. Stvarni prolazi: 4zida 57 prihvaćenih vlasničkih oglasa, Halo 21, Nekretnine.rs 1, Mojtrg 3; raniji KP prolaz 87. To su rezultati odvojenih čitanja, ne broj novih upisa u korisnikovu bazu. Uzorci NadjiDom i Imovina sadržali su agencijske oglase i odbačeni su; potpuna pokrivenost svih portala nije zagarantovana. Kod se još mora objaviti u korisnikovom Vercel projektu.
