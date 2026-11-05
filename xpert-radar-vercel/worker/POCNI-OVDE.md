# Xpert Radar — zaseban pretraživač bez Tavily-ja

Aplikacija ostaje na Vercelu. Ovaj program radi na vašem Windows računaru ili serveru, otvara javne stranice kroz Chromium i šalje rezultate u aplikaciju. Ne zahteva Turso pristupne podatke, lozinku aplikacije ni Tavily ključ. Nema zasebnog troška po Tavily pretrazi; računar/server i internet ostaju potrebni.

## Prvo postavite aplikaciju

1. Zamenite folder `xpert-radar-vercel` na GitHubu celim folderom iz paketa. Sačekajte da najnoviji Vercel deployment bude **Ready**. Root Directory: `xpert-radar-vercel`.
2. Postojeću bazu i promenljive okruženja ostavite. Ne uvozite ponovo PRENOS-PODATAKA.json. Dodaju se tabele za dozvolu istovremene obrade i red ručno zadatih linkova.
3. Prijavite se u aplikaciju. Podešavanja → **Pretraga bez Tavily-ja** → **Napravi ključ i uključi**.
4. Sačuvajte prikazani ključ. To je poseban ključ za pretraživač. Prikazuje se samo pri kreiranju. Novi ključ poništava prethodni. Ne stavljajte ga na GitHub.

## Windows — najjednostavnije

1. Potreban je Node.js 22 LTS ili noviji: https://nodejs.org/ . Ako ga instalirate, ponovo otvorite terminal.
2. U raspakovanom paketu otvorite `xpert-radar-vercel/worker/POKRENI-WINDOWS.cmd` dvoklikom. Nije potrebno pokretanje kao administrator.
3. Pri prvom pokretanju preuzima pakete, pita za **HTTPS adresu aplikacije** i **ključ**, pa instalira Chromium. Potreban je pristup npm i Playwright serverima.
4. Ostavite prozor otvoren. Početni prolaz kreće odmah, sledeći najranije pet minuta po završetku prethodnog. Računar mora biti uključen, povezan i bez sleep režima.
5. Aplikacija prikazuje povezivanje, fazu, vreme poslednjeg prolaza i red za slanje. Dok je otvorena, preuzima novi prikaz na 15 sekundi. Dugme „Osveži oglase“ šalje zahtev ovom programu; ne pokreće Tavily.

Prekid: Ctrl+C. Ponovni početak: isti CMD fajl. Podešavanja ostaju u `worker/.env`, red i neslati oglasi u `worker/data`. Nemojte brisati ovaj folder pri nadogradnji; sačuvajte ga i `.env` pre zamene koda. U istoj aplikaciji aktivnu obradu dobija samo jedan računar; ostali neće pokrenuti paralelno pretraživanje.

## Server 24/7 — Docker

Na Linux serveru sa Docker Compose, iz `xpert-radar-vercel/worker`:

```bash
cp .env.example .env
# U .env unesite RADAR_URL i RADAR_WORKER_TOKEN.
docker compose up -d --build
docker compose logs -f --tail=100
```

Red ostaje u named volume-u `radar-worker-data`. Kontejner se ponovo pokreće posle greške ili restarta servera. Za zaustavljanje: `docker compose down`. Ne koristite `down -v`, jer briše red. Ne pokrećite i Vercel cron kao poseban internet pretraživač; u ovom načinu cron samo stavlja zahtev u red.

## Ručne komande bez Dockera

Iz foldera `worker`:

```bash
npm ci
npm run setup
npm run browser
npm run doctor
npm start
```

`doctor` proverava povezivanje aplikacije i dostupnost lokalnog Chromiuma; ne potvrđuje da portali dozvoljavaju pristup. `npm run once` izvršava jedan prolaz pa završava. Na Linuxu mogu biti potrebne sistemske biblioteke: `npx playwright install --with-deps chromium`.

## Šta radi i koliko čita

- Osam portala: 4zida, Nekretnine.rs, Halo oglasi, Oglasi.rs, NadjiDom, KupujemProdajem, Mojtrg, Imovina.net. Sasomange je izbačen.
- Koristi odabrane izvore i njihove početne liste, postojeće parsere, stvarne linkove narednih stranica i pronađene kategorije za Novi Sad. Tipove koje portal ne povezuje iz tih lista neće automatski pronaći; obuhvat nije jednak potpunoj pokrivenosti svih oglasa.
- Dva izvora istovremeno; najmanje četiri sekunde između čitanja istog portala; podrazumevano najviše 80 stranica po prolazu, do dve liste i osam detalja po izvoru. Početak sledećeg prolaza čeka najmanje pet minuta posle prethodnog, pa ciklus nije garantovano tačno na pet minuta.
- Uspešni detalji čitaju se ponovo posle 24 h. Greške se odlažu uz rastući razmak, a HTTP 401/403/429 i CAPTCHA pauziraju izvor šest sati. Ne rešava CAPTCHA, ne koristi prikrivene proxy-je i ne zaobilazi blokade.
- Do 20.000 URL-ova u trajnom lokalnom redu. Oglasi koji nisu poslati ostaju u outbox-u. Mrežne greške se ponavljaju; trajno odbijeni zapisi čuvaju se lokalno u tabeli `rejections`. Podaci idu u postojeću bazu kroz zaseban API, ponovljeni URL ne pravi novi kontakt.
- „Dodaj link“ i zahtev za javni telefon takođe ulaze u red zasebnog pretraživača, bez Tavily poziva. Obrada može da sačeka završetak pauze izvora.
- Vlasnički kontakt nastaje samo iz jasno označene pojedinačne kartice/detalja. Nejasni oglasi idu na proveru, agencije i oglasi van obuhvata se odbacuju. Prodaja svega; izdavanje samo poslovni prostor/hala/magacin od 150 m². Raniji statusi, beleške i oznake odbijene saradnje ostaju.
- Facebook: samo stranice iz podešavanja. Ako javna stranica zahteva prijavu ili je blokirana, pretraživač prijavljuje grešku. Ne pretražuje grupe, Marketplace ili privatne profile. Facebook objave ostaju za proveru vlasništva.

## Režimi i dijagnostika

U `.env` je podrazumevano `RADAR_READER=browser`. `auto` prvo čita HTTP, a Chromium koristi samo kada je javni HTML kratak; `http` uopšte ne otvara Chromium. HTTP 403 se ne pokušava savladati promenom režima. `RADAR_HEADLESS=false` otvara vidljiv prozor na desktopu, ali i dalje ne rešava provere pristupa.

Ako već imate kompatibilan Chromium, opcionalno zadajte apsolutnu putanju u `RADAR_CHROMIUM_EXECUTABLE`. Preporučena je verzija koju instalira Playwright. Ovo može pomoći ako je preuzimanje browsera onemogućeno na vašoj mreži.

Ako aplikacija vraća HTML umesto JSON-a, proverite da koristite pravi produkcijski domen i da Vercel Deployment Protection ne zahteva Vercel nalog za `/api/worker`. Prijava u samu aplikaciju ostaje zaštićena. Ključ ne šaljite u porukama podrške.

Ako program nije povezan, nema pozadinske pretrage. Ako želite nazad prethodni način rada, u aplikaciji izaberite **Isključi zaseban pretraživač**. Nijedan portal nije garantovano dostupan samo zato što se koristi Chromium.

## Git objava

Iz korena repozitorijuma, nakon zamene foldera:

```bash
git add xpert-radar-vercel
git commit -m "Add standalone Chromium property worker without required Tavily"
git push origin main
```

Ne dodajte `worker/.env`, `worker/data`, `node_modules`, stvarne ključeve i kopiju baze. Paket ih ne sadrži.
