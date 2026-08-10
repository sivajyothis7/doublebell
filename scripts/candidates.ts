/**
 * Curation input.
 *
 * One line per song that belongs on a Kerala private bus, written from memory
 * and from the fan-made "kerala private bus" playlists this repo harvested
 * (see `npm run resolve-tracks`). This file is the *question*; the resolver
 * turns each line into a real YouTube upload with real metadata, and only what
 * survives that pass and a listen gets promoted into `src/content/tracks.ts`.
 *
 * The inclusion filter is not "good Malayalam song". It is: would this come out
 * of a blown 8-inch speaker over a diesel engine, somewhere between two towns,
 * loud enough that the whole bus hears it whether or not it wants to. That rules
 * out most of the classical-leaning canon and lets in things nobody would call
 * tasteful.
 */

export type Candidate = {
  /** Song title, Latin, as people say it. */
  song: string;
  /** Film or album, when known — it disambiguates the search enormously. */
  film?: string;
  /** Expected bucket. The resolver does not use it; curation does. */
  vibe: "mass" | "melody" | "nadan" | "mappila";
  /** Extra words to push the search at the right upload. */
  hint?: string;
};

export const CANDIDATES: readonly Candidate[] = [
  // ── the back seat ────────────────────────────────────────────────── mass ──
  { song: "Ente Khalbile Vellaram Kunnil", film: "Classmates", vibe: "mass" },
  { song: "Kalabham Tharaam", film: "Aniyathipraavu", vibe: "mass" },
  { song: "Kilukil Pambaram", film: "Kilukkam", vibe: "mass" },
  { song: "Padakali Chandi Chankuruthi", film: "Yodha", vibe: "mass" },
  { song: "Thakilu Pukilu", film: "Ravanaprabhu", vibe: "mass" },
  { song: "Pottukuthedi", film: "Ravanaprabhu", vibe: "mass" },
  { song: "Karutha Penne", film: "Thenmavin Kombath", vibe: "mass" },
  { song: "Entammede Jimikki Kammal", film: "Velipadinte Pusthakam", vibe: "mass" },
  { song: "Manikya Malaraya Poovi", film: "Oru Adaar Love", vibe: "mass" },
  { song: "Kudukku", film: "Love Action Drama", vibe: "mass" },
  { song: "Aluva Puzhayude Theerathu", film: "Premam", vibe: "mass" },
  { song: "Karuppinazhaku", film: "Swapnakkoodu", vibe: "mass" },
  { song: "Avvaa Havvaa", film: "Sathyam Sivam Sundaram", vibe: "mass" },
  { song: "Rab Rab", film: "Mallu Singh", vibe: "mass" },
  { song: "Jillam Jillala", film: "Honey Bee 2", vibe: "mass" },
  { song: "Pista", film: "Neram", vibe: "mass", hint: "run anthem" },
  { song: "Maangalyam", film: "Bangalore Days", vibe: "mass" },
  { song: "Vaanam Thilathilakkanu", film: "CIA", vibe: "mass" },
  { song: "Appangalembadum", film: "Manichitrathazhu", vibe: "mass" },
  { song: "Olathumbathiruvaka", film: "Kannezhuthi Pottum Thottu", vibe: "mass" },
  { song: "Kandu Randu Kannu", film: "Kilichundan Mampazham", vibe: "mass" },
  { song: "Muthumazha", film: "Big B", vibe: "mass" },
  { song: "Chekele", film: "Chotta Mumbai", vibe: "mass" },
  { song: "Kettu Kettu", film: "Mayavi", vibe: "mass" },
  { song: "Kannum Kannum Thammil", film: "Nadodikkattu", vibe: "mass" },
  { song: "Manasil Midhunamazha", film: "Kayyethum Doorath", vibe: "mass" },
  { song: "Hey Ho Malayalee", film: "Salt N Pepper", vibe: "mass", hint: "premasudha" },
  { song: "Vaathil Melle Thurannu", film: "Neram", vibe: "mass" },
  { song: "Kaattu Mooliyo", film: "Ohm Shanthi Oshaana", vibe: "mass" },
  { song: "Chillanjirukkile", film: "Chithram", vibe: "mass" },
  { song: "Kando Kando", film: "Chandupottu", vibe: "mass" },
  { song: "Aaro Nenjil", film: "Aaro", vibe: "mass" },

  // ── after the last town ────────────────────────────────────────── melody ──
  { song: "Kaathirunnu Kaathirunnu", film: "Classmates", vibe: "melody" },
  { song: "Devadoothar Paadi", film: "Aniyathipraavu", vibe: "melody" },
  { song: "Malare", film: "Premam", vibe: "melody" },
  { song: "Jeevamshamayi", film: "Theevandi", vibe: "melody" },
  { song: "Pavizha Mazha", film: "Athiran", vibe: "melody" },
  { song: "Karimizhi Kuruviye", film: "Meghamalhar", vibe: "melody" },
  { song: "Anuragini Itha", film: "Oru Kudakkezhil", vibe: "melody" },
  { song: "Kasthoorimaan Kurunne", film: "Kanamarayathu", vibe: "melody" },
  { song: "Koottil Ninnum", film: "Thalavattam", vibe: "melody" },
  { song: "Onnam Ragam Paadi", film: "Kaathodu Kaathoram", vibe: "melody" },
  { song: "Aayiram Kannumai", film: "Nokkethadhoorathu Kannum Nattu", vibe: "melody" },
  { song: "Thumbi Vaa Thumbakudathin", film: "Olangal", vibe: "melody" },
  { song: "Ilam Manjin Kulirumay", film: "Ninnishtam Ennishtam", vibe: "melody" },
  { song: "Poonkatte Poyi Chollamo", film: "Aayushkaalam", vibe: "melody" },
  { song: "Anthiveyil Ponnu Thirum", film: "Ulladakkam", vibe: "melody" },
  { song: "Nee En Sarga Soundaryame", film: "Chandralekha", vibe: "melody" },
  { song: "Aaro Viral Meetti", film: "Chandralekha", vibe: "melody" },
  { song: "Etho Varmukilin", film: "Pathram", vibe: "melody" },
  { song: "Kannil Kannil", film: "Niram", vibe: "melody" },
  { song: "Chandanalepa Sugandham", film: "Kanmadam", vibe: "melody" },
  { song: "Ramakadha Ganalayam", film: "Bharatham", vibe: "melody" },
  { song: "Devi Athmaragam", film: "Chithram", vibe: "melody" },
  { song: "Muthuchippi Poloru", film: "Thattathin Marayathu", vibe: "melody" },
  { song: "Anuraga Vilochananayi", film: "Ennu Ninte Moideen", vibe: "melody" },
  { song: "Dooreyo", film: "Aanandam", vibe: "melody" },
  { song: "Arikil Pathiye", film: "Oru Murai Vanthu Paarthaya", vibe: "melody" },
  { song: "Meharuban", film: "Perumazhakkalam", vibe: "melody" },
  { song: "Varamanjaladiya", film: "Chandranudikkunna Dikkil", vibe: "melody" },
  { song: "Kannil Nirakkum", film: "Ustad", vibe: "melody" },
  { song: "Pathiraavayi Neram", film: "Aaram Thampuran", vibe: "melody" },
  { song: "Harimuraleeravam", film: "Aaram Thampuran", vibe: "melody" },
  { song: "Sundari Kannal", film: "Aniyathipraavu", vibe: "melody" },
  { song: "Vaishakhasandhye", film: "Ilanjippookkal", vibe: "melody" },
  { song: "Ennodenthinee Pilla", film: "Vellanakalude Nadu", vibe: "melody" },
  { song: "Enthinen Kalari", film: "Sargam", vibe: "melody" },

  // ── the toddy shop, moved onto a bus ────────────────────────────── nadan ──
  { song: "Chalakkudikkaran Changathi", film: "Kalabhavan Mani", vibe: "nadan" },
  { song: "Odapazham Poloru Pennu", film: "Kalabhavan Mani", vibe: "nadan" },
  { song: "Njan Kudikkana Kanjeelenthinu", film: "Kalabhavan Mani", vibe: "nadan" },
  { song: "Aappapurappetta Neettithuppan", film: "Kalabhavan Mani", vibe: "nadan" },
  { song: "Kunjunnaalil", film: "Kalabhavan Mani", vibe: "nadan" },
  { song: "Varuthantoppam", film: "Kalabhavan Mani", vibe: "nadan" },
  { song: "Kuttanadan Punchayile", vibe: "nadan", hint: "vanchipattu original" },
  { song: "Kuttanadan Kayalile", film: "Kazhcha", vibe: "nadan" },
  { song: "Kadalinakkare Ponore", vibe: "nadan", hint: "Yesudas nadan pattu" },
  { song: "Onnanam Kunnil Oradi Kunnil", vibe: "nadan", hint: "nadan pattu" },
  { song: "Ambalappuzhe Unnikannanodu", vibe: "nadan", hint: "nadan pattu" },
  { song: "Kaikottum Kokkara", vibe: "nadan", hint: "nadan pattu" },
  { song: "Vaadi Vaadi Kanne", vibe: "nadan", hint: "nadan pattu" },

  // ── Malabar's own metre ───────────────────────────────────────── mappila ──
  { song: "Palnila Punchiri", film: "Midad", vibe: "mappila" },
  { song: "Mylanchi Monchulla", vibe: "mappila", hint: "mappila pattu album" },
  { song: "Oru Kotta Ponnundallo", vibe: "mappila", hint: "mappila pattu" },
  { song: "Kannil Kannil Nokkiya", vibe: "mappila", hint: "mappila pattu album" },
  { song: "Erivum Puliyum", film: "Thattathin Marayathu", vibe: "mappila" },
  { song: "Kaithapoo Manamundu", vibe: "mappila", hint: "mappila pattu" },
  { song: "Nallal Peruthoru", vibe: "mappila", hint: "mappila pattu" },
  { song: "Kasavinte Thattamittu", vibe: "mappila", hint: "mappila pattu" },

  /*
   * ── second pass ──────────────────────────────────────────────────────────
   *
   * Written after reading what the first pass came back with. Two kinds of
   * entry here: songs the first search drifted off (the film was wrong in my
   * head — "Devadoothar Paadi" is Kaathodu Kaathoram, not Aniyathipraavu, and
   * "Onnam Ragam Paadi" is Thoovanathumbikal), now pinned with the composer or
   * singer in the hint; and Kalabhavan Mani's nadan catalogue, which the
   * harvested bus playlists are full of and which I had barely represented.
   *
   * The resolver caches by song + film + hint, so re-running only fetches these.
   */

  // retries, pinned hard enough that the search cannot wander
  { song: "Ente Khalbile Vellaram Kunnil", film: "Classmates", vibe: "mass", hint: "Alex Paul Vineeth Sreenivasan 2006 video song" },
  { song: "Kalabham Tharam", film: "Aniyathipraavu", vibe: "mass", hint: "Berny Ignatius official video song" },
  { song: "Anuragini Itha", film: "Oru Kudakkezhil", vibe: "melody", hint: "Shyam Yesudas 1985 original" },
  { song: "Etho Varmukilin", film: "Pathram", vibe: "melody", hint: "Vidyasagar Yesudas 1999 video song" },
  { song: "Kannil Kannil Minnal", film: "Niram", vibe: "melody", hint: "Vidyasagar 1999 video song" },
  { song: "Aaro Viral Meetti", film: "Chandralekha", vibe: "melody", hint: "Vidyasagar Yesudas 1997 video song" },
  { song: "Chandanalepa Sugandham", film: "Kanmadam", vibe: "melody", hint: "Vidyasagar Yesudas 1998" },
  { song: "Kandu Randu Kannu", film: "Kilichundan Mampazham", vibe: "mass", hint: "Vidyasagar 2003 video song" },
  { song: "Devi Athmaragam", film: "Chithram", vibe: "melody", hint: "Kannur Rajan Yesudas 1988" },
  { song: "Harimuraleeravam", film: "Aaram Thampuran", vibe: "melody", hint: "Raveendran Yesudas 1997 video song" },
  { song: "Maangalyam Thanthunanena", film: "Bangalore Days", vibe: "mass", hint: "Gopi Sundar official video song" },
  { song: "Thumbi Vaa Thumbakudathin", film: "Olangal", vibe: "melody", hint: "Yesudas Sujatha 1982 original song" },
  { song: "Ramakadha Ganalayam", film: "Bharatham", vibe: "melody", hint: "Raveendran Yesudas video song" },
  { song: "Aluva Puzhayude Theerathu", film: "Premam", vibe: "mass", hint: "Rajesh Murugesan official video song" },
  { song: "Pattu Padi Urakkam Njan", film: "Thenmavin Kombathu", vibe: "melody", hint: "Berny Ignatius Yesudas video song" },
  { song: "Vithum Kaikkottum", film: "Thenmavin Kombathu", vibe: "nadan", hint: "Berny Ignatius video song" },
  { song: "Kaathodu Kaathoram", film: "Kaathodu Kaathoram", vibe: "melody", hint: "Ouseppachan Yesudas title song" },
  { song: "Mizhiyoram Nananju", film: "Manjil Virinja Pookkal", vibe: "melody", hint: "Jerry Amaldev Yesudas 1980" },
  { song: "Devanganangal Kaikozhiyum", film: "His Highness Abdullah", vibe: "melody", hint: "Raveendran Yesudas 1990" },
  { song: "Chirakodinja Kinavukal", film: "Thattathin Marayathu", vibe: "melody", hint: "Shaan Rahman video song" },
  { song: "Anuraagathin Velayil", film: "Thattathin Marayathu", vibe: "melody", hint: "Shaan Rahman video song" },
  { song: "Poomuthole", film: "Joseph", vibe: "melody", hint: "Ranjin Raj official video song" },
  { song: "Pavizha Muthu", film: "Joseph", vibe: "melody", hint: "Ranjin Raj official video song" },
  { song: "Lailakame", film: "Ezra", vibe: "melody", hint: "Rahul Raj official video song" },
  { song: "Kaathirunnu Kaathirunnu", film: "Classmates", vibe: "melody", hint: "Alex Paul 2006" },

  // Kalabhavan Mani's nadan catalogue — the spine of the harvested playlists
  { song: "Nee Kettodi Janu", film: "Kalabhavan Mani", vibe: "nadan", hint: "nadan pattu audio song" },
  { song: "Engupoyi En Seethe", film: "Kalabhavan Mani", vibe: "nadan", hint: "nadan pattu audio song" },
  { song: "Ente Kunjeli", film: "Kalabhavan Mani", vibe: "nadan", hint: "nadan pattu audio song" },
  { song: "Melooru Shappilorikkalu", film: "Kalabhavan Mani", vibe: "nadan", hint: "nadan pattu audio song" },
  { song: "Maari Poomari", film: "Kalabhavan Mani", vibe: "nadan", hint: "odapazham nadan pattu audio song" },
  { song: "Kanni Prasavam", film: "Kalabhavan Mani", vibe: "mappila", hint: "mappila pattu audio song" },
  { song: "Kadakkanninmunakonden", film: "Kalabhavan Mani", vibe: "mappila", hint: "mappila pattu audio song" },
  { song: "Kattile Kaatana", film: "Kalabhavan Mani", vibe: "nadan", hint: "ballettan molalledi nadan pattu" },
];
