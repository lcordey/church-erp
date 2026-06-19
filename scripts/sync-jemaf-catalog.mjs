import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

import {
  createDeterministicUuid,
  jemafSnapshotPath as snapshotPath,
  padCollectionNumber,
  slugify,
} from "./song-pdf-library.mjs";

const projectRoot = process.cwd();
const seedPath = path.join(projectRoot, "supabase", "seed.sql");

const knownCollections = {
  jem: {
    key: "jem",
    code: "JEM",
    label: "J'aime l'Eternel",
    prefix: "jem",
    maxNumber: 1200,
  },
  jemk: {
    key: "jemk",
    code: "JEMK",
    label: "JEM Kids",
    prefix: "jemk",
    maxNumber: 196,
  },
  af: {
    key: "af",
    code: "AF",
    label: "Ailes de la Foi",
    prefix: "af",
    maxNumber: 655,
  },
  atg: {
    key: "atg",
    code: "ATG",
    label: "À Toi la Gloire",
    prefix: "atg",
    maxNumber: 400,
  },
};

const defaultCollectionKeys = ["jem", "jemk", "af", "atg"];

const localSongs = [
  {
    id: "66666666-6666-4666-8666-666666666666",
    title: "Que ma bouche chante ta louange",
    slug: "que-ma-bouche-chante-ta-louange",
    status: "published",
    author: "Communauté de l'Emmanuel",
    copyright: "© Communauté de l'Emmanuel",
    defaultKey: "D",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    chordProContent: `{title: Que ma bouche chante ta louange}
{key: D}

{comment: Couplet}
[D]Que ma bouche chante ta [G]louange,
[Bm]Que mon cœur célèbre ton [A]nom.

{comment: Refrain}
[G]Sois béni, Seigneur, pour ta [D]fidélité,
[Em]Ta présence renouvelle ma [A]joie.`,
    sourceChordProUrl: null,
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    title: "Bénissez le Seigneur",
    slug: "benissez-le-seigneur",
    status: "published",
    author: null,
    copyright: null,
    defaultKey: "Em",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "99999999-9999-4999-8999-999999999999",
    chordProContent: `{title: Bénissez le Seigneur}
{key: Em}

{comment: Refrain}
[Em]Bénissez le Seigneur,
[C]Vous tous serviteurs du Sei[D]gneur.
[G]Levez les mains vers lui,
[Am]Et célébrez son [B7]nom.`,
    sourceChordProUrl: null,
  },
  {
    id: "88888888-8888-4888-8888-888888888888",
    title: "Chant en préparation",
    slug: "chant-en-preparation",
    status: "published",
    author: "Équipe louange",
    copyright: null,
    defaultKey: "C",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "12121212-1212-4212-8212-121212121212",
    chordProContent: `{title: Chant en préparation}
{key: C}

{comment: Couplet}
[C]Voici un chant préparé pour l'équipe,
[F]Simple brouillon devenu exemple local.

{comment: Refrain}
[Am]Que nos voix s'accordent,
[F]Pour servir avec [G]joie.`,
    sourceChordProUrl: null,
  },
  {
    id: "99999999-9999-4999-8999-999999999999",
    title: "Grâce infinie",
    slug: "grace-infinie",
    status: "published",
    author: "Équipe louange",
    copyright: "LeMont",
    defaultKey: "G",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "13131313-1313-4313-8313-131313131313",
    chordProContent: `{title: Grâce infinie}
{key: G}

{comment: Couplet}
[G]Ta grâce me relève,
[Em]Ta paix conduit mes pas.

{comment: Refrain}
[C]Nous chantons ta fidélité,
[D]Seigneur, tu es notre joie.`,
    sourceChordProUrl: null,
  },
  {
    id: "abababab-abab-4bab-8bab-abababababab",
    title: "Notre espérance",
    slug: "notre-esperance",
    status: "published",
    author: "Équipe louange",
    copyright: "LeMont",
    defaultKey: "A",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "14141414-1414-4414-8414-141414141414",
    chordProContent: `{title: Notre espérance}
{key: A}

{comment: Couplet}
[A]Dans la nuit tu restes proche,
[F#m]Ta lumière ouvre un chemin.

{comment: Refrain}
[D]Christ est notre espérance,
[E]Notre chant jusqu’au matin.`,
    sourceChordProUrl: null,
  },
  {
    id: "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd",
    title: "Lavé",
    slug: "lave",
    status: "published",
    author: "UPPERROOM",
    copyright: "LeMont",
    defaultKey: "B",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "15151515-1515-4515-8515-151515151515",
    chordProContent: `{title: Lavé}
{subtitle: Washed}
{artist: UPPERROOM}
{key: B}

{start_of_verse: Couplet 1}
[B]J’étais perdu, [B]l’enfant rebelle si loin de [E]toi
[B]Mais sur la Croix, [B]Tu as pensé à [E]moi
[B]Là sur le sable, [B]j’avais bâti ma mai[E]son
[B]J’étais prisonnier du [B]Mal et ses men[E]songes
{end_of_verse}

{start_of_verse: Pré-refrain}
[E]Tu es entré dans ma tombe
[F#]Riant à ma gêne, ma honte
[G#m7]Et mes peurs sont restées à terre
[B]Je me lève et je [F#]chante
{end_of_verse}

{start_of_chorus: Refrain}
[B]Je suis lavé par le [Bsus]sang de l’[B]Agneau
[G#m7]Je suis lavé par le sang de l’Agneau
[F#]Par tes plaies, mes péchés effacés, je suis [E]innocent
{end_of_chorus}

{start_of_verse: Couplet 2}
[B]Couvert de beauté
[B]Vêtu du manteau de [E]justice
[B]Je crois en tes promesses
[B]Tu ne m’abandonnes [E]pas
Car j’ai [G#7]trouvé un amour [F#]qui me remplis encore et [E]encore
Car j’ai [G#7]goûté ta liberté [F#]qui engloutit mes [E]péchés
{end_of_verse}

{start_of_verse: Pré-refrain}
[E]Tu es entré dans ma tombe
[F#]Riant à ma gêne, ma honte
[G#m7]Et mes peurs sont restées à terre
[B]Je me lève et je [F#]chante
{end_of_verse}

{chorus}

{start_of_chorus: Refrain 2}
[B]Je suis lavé par le [Bsus]sang de l’[B]Agneau
[G#m7]Je suis lavé par le sang de l’Agneau
[F#]Par tes plaies, je n’ai jamais été aussi proche de [E]toi
{end_of_chorus}

{start_of_bridge: Pont - 2x}
[B]Gloire au Seigneur éle[C#7]vé
[G#7]Nul n’est comme [F#]toi
[B]Que ma prière monte à [C#m7]toi
[G#m7]Mon défenseur, mon re[F#]fuge
{end_of_bridge}

{comment: Refrain + Refrain 2}`,
    sourceChordProUrl: null,
  },
  {
    id: "dededede-dede-4ede-8ede-dededededede",
    title: "Notre premier amour",
    slug: "notre-premier-amour",
    status: "published",
    author: "Harvest",
    copyright: "LeMont",
    defaultKey: "Bbm",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "16161616-1616-4616-8616-161616161616",
    chordProContent: `{title: Notre premier amour}
{subtitle: Only One}
{artist: Harvest}
{key: Bbm}

{start_of_verse: Partie 1 - 2x}
[Bbm]Je veux qu’il n’y ait que moi
Sur le trône de ton cœur
[Gb]Que tu ne vives que pour [Ab]moi
{end_of_verse}

{start_of_verse: Partie 2}
[Gb]J’effacerai le nom de tes [Ab]a[Bbm]mants
[Gb]Il ne restera dans ton [Ab]cœur
[Bbm]Que le mien

J’inscrirai sur [Gb]toi
[Ab]Mon nom à ja[Bbm]mais
[Gb]Et tu sauras à chaque [Ab]instant
[Bbm]Que je suis Dieu
{end_of_verse}

{start_of_chorus: Refrain}
[Bbm]Reviens, reviens
Recommence à zéro
[Gb]Reviens, reviens
À notre premier a[Ab]mour
{end_of_chorus}`,
    sourceChordProUrl: null,
  },
  {
    id: "efefefef-efef-4fef-8fef-efefefefefef",
    title: "Promesses",
    slug: "promesses",
    status: "published",
    author: "LeMont",
    copyright: "LeMont",
    defaultKey: "Em",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "17171717-1717-4717-8717-171717171717",
    chordProContent: `{title: Promesses}
{key: Em}

{start_of_verse: Couplet 1}
[Em]Présent et [C]passé
[G]Premier et dernier
[D]Tu es le Dieu d’éterni[Em]té

[C]Années après années
[G]Tu nous as prouvé
[D]Ta grande fidélité
{end_of_verse}

{start_of_verse: Pré-refrain}
[Em]Et si je subi
[C]Les tourments sans répit
[G]Je reste ferme dans ma [D]foi
[Em]Petit à petit
[C]Mon cœur saisi
[G]Tes promesses ne changent [D]pas
{end_of_verse}

{start_of_chorus: Refrain}
[Em]Je veux te [G]glorifier [C]Sei[G]gneur
[Em]Tu es la [G]majesté [C]de mon [G]cœur
[Em]Tu es bien plus haut
[G]Tu es bien plus grand
[C]Que toutes mes pen[G]sées
[Em]Je veux tout [G]déposer [C]Sei[G]gneur
{end_of_chorus}

{start_of_verse: Couplet 2}
[Em]Dieu attention[C]né
[G]Le monde peut s’écrouler
[D]Ta parole reste cen[Em]sée
[C]L’histoire a prouvé
[G]Que rien ne peut séparer
[D]Notre intimité
{end_of_verse}

{start_of_verse: Pré-refrain}
[Em]Et si je subi
[C]Les tourments sans répit
[G]Je reste ferme dans ma [D]foi
[Em]Petit à petit
[C]Mon cœur saisi
[G]Tes promesses ne changent [D]pas
{end_of_verse}

{chorus}

{start_of_bridge: Pont - 3x}
[C]Je place ma foi en [G]JÉSUS
[Em]Mon ancre dans les [D]vagues
[C]Mon espoir, ma fon[G]dation
[Em]En lui je trouve la [D]vie
{end_of_bridge}

{start_of_chorus: Final - 2x}
[G]Je veux te glorifier [C]Sei[G]gneur
[G]Tu es la majesté [C]de mon [G]cœur
{end_of_chorus}`,
    sourceChordProUrl: null,
  },
  {
    id: "f0f0f0f0-f0f0-40f0-80f0-f0f0f0f0f0f0",
    title: "Roi Ressuscité",
    slug: "roi-ressuscite",
    status: "published",
    author: "LeMont",
    copyright: "LeMont",
    defaultKey: "G",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "18181818-1818-4818-8818-181818181818",
    chordProContent: `{title: Roi Ressuscité}
{key: G}

{start_of_verse: Couplet 1}
[C]Autrefois [Em]couronné d’é[D]pines
[C]Aujourd’hui [G]glorifié
[C]C’est lui qui a [Em]lavé nos [D]pieds
[C]À ses pieds nous [G]louons

[C]Il a porté [Em]tous nos [D]péchés
[C]Pour nous [G]libérer
[C]La lumière de son [Em]grand a[D]mour
[C]Brille sur nous pour [G]toujours
{end_of_verse}

{start_of_chorus: Refrain}
[C]Ton nom, ton [G]nom c’est ma [D]victoire
[C]Mes mains s’élèvent [G]pour le témoi[D]gner
[C]Jésus, Jésus [G]a tout ga[D]gné
[C]Mon cœur est prêt [G]à le rece[D]voir
{end_of_chorus}

{start_of_bridge: Pont}
[C]Ton esprit me [G]relève[D]ra
[Em]Des mensonges auxquels je [C]crois
[G]Le Roi ressuscité, [D]me ressusci[Em]te[C]ra

[G]En soufflant ta vie en [D]moi
[Em]Tu as vaincu tous mes com[C]bats
[G]Le Roi ressuscité, [D]me ressusci[Em]te[C]ra
[G]Le Roi ressuscité, [D]me ressusci[Em]te[C]ra
{end_of_bridge}

{start_of_verse: Couplet 3}
[C]Nous avons mis à [Em]mort Jé[D]sus
[C]Jésus le Prince de [G]Vie
[C]La mort ne l’a pas [Em]rete[G]nu
[C]Il a payé le [G]prix
{end_of_verse}

{chorus: Reprise du refrain}
{comment: Reprise du pont possible}`,
    sourceChordProUrl: null,
  },
  {
    id: "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1",
    title: "Sur la croix",
    slug: "sur-la-croix",
    status: "published",
    author: "UPPERROOM",
    copyright: "LeMont",
    defaultKey: "C#",
    collection: "LeMont",
    collectionNumber: null,
    sourcePageUrl: null,
    isEditable: true,
    chordSourceId: "19191919-1919-4919-8919-191919191919",
    chordProContent: `{title: Sur la croix}
{subtitle: Oh the Cross}
{artist: UPPERROOM}
{key: C#}

{start_of_verse: Couplet 1}
[C#]Tu as porté la [F#]croix sur ton [C#]dos
[G#]Saignant jusqu’à ton dernier [A#m]souffle
[F#]Des larmes de sang, une couronne d’é[C#]pines
[G#]Tu t’es chargé de nos pé[A#m]chés
{end_of_verse}

{start_of_verse: Pré-refrain}
[F#]Oh [C#]oh
[G#]L’unique, le vrai a[A#m]mour
[F#]Oh [C#]oh
[G#]L’unique, le vrai a[A#m]mour
{end_of_verse}

{start_of_chorus: Refrain}
[G#]Sur la croix
Tu es mort
[F#]Et c’est assez puissant, assez puis[C#]sant

[G#]Sur la croix
Tu es mort
[F#]Et rien n’est trop grand pour la puissance de ton [C#]sang
{end_of_chorus}

{start_of_verse: Couplet 2 - 2x}
[C#]Ton sacrifice a [F#]changé l’His[C#]toire
Les clous dans tes mains, [G#]ces mains qui me [A#m]sauvent
[F#]Le tombeau ouvert, la mort est vain[C#]cue
[G]Nous crions ton nom victo[A#m]rieux
{end_of_verse}

{chorus: Refrain - 2x}

{start_of_bridge: Pont - 2x}
[C#]Merci
D’avoir brisé le pain de ton [G#]corps
D’avoir versé le vin de ton [D#m]sang
[A#m]Merci
Mon cœur s’écrie à ja[F#]mais
{end_of_bridge}

{chorus: Refrain - 2x}`,
    sourceChordProUrl: null,
  },
];

function getRequestedCollections() {
  const configured =
    process.env.JEMAF_COLLECTIONS
      ?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean) ?? defaultCollectionKeys;

  return configured.map((key) => {
    const collection = knownCollections[key];

    if (!collection) {
      throw new Error(
        `Unknown collection "${key}". Supported values: ${Object.keys(
          knownCollections,
        ).join(", ")}.`,
      );
    }

    return collection;
  });
}

function parseChordProDirective(content, names) {
  for (const name of names) {
    const pattern = new RegExp(`^\\{${name}:\\s*(.+?)\\s*\\}$`, "im");
    const match = content.match(pattern);

    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

function parseChordProComments(content) {
  return [...content.matchAll(/^\{(?:c|comment):\s*(.+?)\s*\}$/gim)].map(
    (match) => match[1].trim(),
  );
}

function extractCopyright(content) {
  const comments = parseChordProComments(content);

  for (const comment of comments) {
    if (comment.includes("©")) {
      return comment;
    }
  }

  return null;
}

function cleanupText(content) {
  return content.replace(/\r\n/g, "\n").trim();
}

function normalizeOptionalText(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = cleanupText(value);
  return trimmed || null;
}

function escapeSqlLiteral(value) {
  return value.replaceAll("'", "''");
}

function toSqlLiteral(value) {
  if (value === null) {
    return "null";
  }

  return `'${escapeSqlLiteral(value)}'`;
}

function toSqlInteger(value) {
  return value === null ? "null" : String(value);
}

function toSqlBoolean(value) {
  return value ? "true" : "false";
}

function toSqlChordProDollarQuoted(value) {
  return `$chordpro$${value}$chordpro$`;
}

function renderSongTuple(song) {
  return `  (
    ${toSqlLiteral(song.id)},
    ${toSqlLiteral(song.title)},
    ${toSqlLiteral(song.slug)},
    ${toSqlLiteral(song.status)},
    ${toSqlLiteral(song.author)},
    ${toSqlLiteral(song.copyright)},
    ${toSqlLiteral(song.defaultKey)},
    ${toSqlLiteral(song.collection)},
    ${toSqlInteger(song.collectionNumber)},
    ${toSqlLiteral(song.sourcePageUrl)},
    ${toSqlBoolean(song.isEditable)}
  )`;
}

function renderChordSourceTuple(song) {
  return `  (
    ${toSqlLiteral(song.chordSourceId)},
    ${toSqlLiteral(song.id)},
    'chordpro',
    'active',
    ${toSqlChordProDollarQuoted(song.chordProContent)},
    ${toSqlLiteral(song.sourceChordProUrl)}
  )`;
}

function renderSeedSql(officialSongs) {
  const allSongs = [...officialSongs, ...localSongs];

  return `-- Generated by scripts/sync-jemaf-catalog.mjs
-- Do not edit this file manually. Regenerate it from the JEMAF snapshot.

insert into public.songs (
  id,
  title,
  slug,
  status,
  author,
  copyright,
  default_key,
  collection,
  collection_number,
  source_page_url,
  is_editable
)
values
${allSongs.map(renderSongTuple).join(",\n")}
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  status = excluded.status,
  author = excluded.author,
  copyright = excluded.copyright,
  default_key = excluded.default_key,
  collection = excluded.collection,
  collection_number = excluded.collection_number,
  source_page_url = excluded.source_page_url,
  is_editable = excluded.is_editable,
  updated_at = now();

insert into public.song_sources (
  id,
  song_id,
  source_type,
  status,
  text_content,
  external_url
)
values
${allSongs.map(renderChordSourceTuple).join(",\n")}
on conflict (id) do update set
  song_id = excluded.song_id,
  source_type = excluded.source_type,
  status = excluded.status,
  text_content = excluded.text_content,
  external_url = excluded.external_url,
  updated_at = now();
`;
}

function toSongUrls(collection, collectionNumber) {
  const padded = padCollectionNumber(collectionNumber).toLowerCase();
  const code = `${collection.prefix}${padded}`;

  return {
    code,
    pageUrl: `https://jemaf.fr/chant/${code}`,
    chordProUrl: `https://jemaf.fr/ressources/chordPro/${code}.chordpro`,
  };
}

async function fetchText(url, accept = "text/plain, text/html;q=0.8, */*;q=0.5") {
  const response = await fetch(url, {
    headers: {
      "user-agent": "church-erp seed sync",
      accept,
    },
  });

  if (!response.ok) {
    return null;
  }

  return {
    text: await response.text(),
    contentType: response.headers.get("content-type") ?? "",
  };
}

async function fetchChordPro(url) {
  const result = await fetchText(url);

  if (!result) {
    return null;
  }

  const cleaned = cleanupText(result.text);

  if (
    result.contentType.includes("text/html") ||
    cleaned.startsWith("<!DOCTYPE html") ||
    cleaned.startsWith("<html") ||
    !cleaned.includes("{")
  ) {
    return null;
  }

  return cleaned;
}

function extractPageSongData(html) {
  const match = html.match(/var chant = (\{.+?\});\s*<\/script>/s);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function normalizeSubtitle(author, composer) {
  if (author && composer) {
    return author === composer ? author : `${author} - ${composer}`;
  }

  return author ?? composer ?? null;
}

function cleanupLyricsBlock(text, part) {
  const cleaned = cleanupText(text);

  if (!part) {
    return cleaned;
  }

  return cleaned.replace(
    new RegExp(`^${part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\.\\s*`),
    "",
  );
}

function getSectionLabel(section) {
  const baseLabel =
    section.style === "refrain"
      ? "Refrain"
      : section.style === "pont"
        ? "Pont"
        : section.style === "intro"
          ? "Introduction"
          : section.style === "fin"
            ? "Fin"
            : "Strophe";

  return section.part ? `${baseLabel} ${section.part}` : baseLabel;
}

function getSectionDirective(style) {
  if (style === "refrain") {
    return ["{start_of_chorus}", "{end_of_chorus}"];
  }

  if (style === "pont") {
    return ["{start_of_bridge}", "{end_of_bridge}"];
  }

  return ["{start_of_verse}", "{end_of_verse}"];
}

function renderSynthesizedChordPro(songCode, pageSong) {
  const lines = [];
  const title = normalizeOptionalText(pageSong?.text?.title);
  const subtitle = normalizeSubtitle(
    normalizeOptionalText(pageSong?.text?.author),
    normalizeOptionalText(pageSong?.text?.composer),
  );
  const copyright = normalizeOptionalText(pageSong?.text?.copyright);
  const key = normalizeOptionalText(pageSong?.data?.tone);

  if (title) {
    lines.push(`{title: ${title}}`);
  }

  if (subtitle) {
    lines.push(`{subtitle: ${subtitle}}`);
  }

  if (copyright) {
    lines.push(`{comment: ${copyright}}`);
  }

  lines.push(`{comment: jemaf.fr – ${songCode.toUpperCase()}}`);

  if (key) {
    lines.push(`{key: ${key}}`);
  }

  const sections = Array.isArray(pageSong?.text?.lyrics) ? pageSong.text.lyrics : [];

  for (const section of sections) {
    const text = normalizeOptionalText(section?.text);

    if (!text) {
      continue;
    }

    const [startDirective, endDirective] = getSectionDirective(section.style);

    lines.push("");
    lines.push(`{comment: ${getSectionLabel(section)}}`);
    lines.push(startDirective);

    for (const lyricLine of cleanupLyricsBlock(text, section.part).split("\n")) {
      lines.push(lyricLine);
    }

    lines.push(endDirective);
  }

  return lines.join("\n").trim();
}

function parseSongFromChordPro(collection, collectionNumber, chordProContent) {
  const title =
    parseChordProDirective(chordProContent, ["title", "t"]) ??
    `${collection.code} ${padCollectionNumber(collectionNumber)}`;
  const author = parseChordProDirective(chordProContent, ["subtitle", "st"]);
  const defaultKey = parseChordProDirective(chordProContent, ["key"]);
  const copyright = extractCopyright(chordProContent);
  const { pageUrl, chordProUrl } = toSongUrls(collection, collectionNumber);
  const slug = `${collection.code.toLowerCase()}-${padCollectionNumber(collectionNumber)}-${slugify(title)}`;

  return {
    id: createDeterministicUuid(
      "song",
      `${collection.code}:${collectionNumber}`,
    ),
    title,
    slug,
    status: "published",
    author,
    copyright,
    defaultKey,
    collection: collection.code,
    collectionNumber,
    sourcePageUrl: pageUrl,
    isEditable: false,
    chordSourceId: createDeterministicUuid(
      "song-source",
      `${collection.code}:${collectionNumber}:chordpro`,
    ),
    chordProContent,
    sourceChordProUrl: chordProUrl,
  };
}

function parseSongFromPage(collection, collectionNumber, pageSong) {
  const { code, pageUrl } = toSongUrls(collection, collectionNumber);
  const title =
    normalizeOptionalText(pageSong?.text?.title) ??
    `${collection.code} ${padCollectionNumber(collectionNumber)}`;
  const author = normalizeSubtitle(
    normalizeOptionalText(pageSong?.text?.author),
    normalizeOptionalText(pageSong?.text?.composer),
  );
  const copyright = normalizeOptionalText(pageSong?.text?.copyright);
  const defaultKey = normalizeOptionalText(pageSong?.data?.tone);
  const slug = `${collection.code.toLowerCase()}-${padCollectionNumber(collectionNumber)}-${slugify(title)}`;

  return {
    id: createDeterministicUuid(
      "song",
      `${collection.code}:${collectionNumber}`,
    ),
    title,
    slug,
    status: "published",
    author,
    copyright,
    defaultKey,
    collection: collection.code,
    collectionNumber,
    sourcePageUrl: pageUrl,
    isEditable: false,
    chordSourceId: createDeterministicUuid(
      "song-source",
      `${collection.code}:${collectionNumber}:chordpro`,
    ),
    chordProContent: renderSynthesizedChordPro(code, pageSong),
    sourceChordProUrl: pageUrl,
  };
}

async function importCollectionSong(collection, collectionNumber) {
  const { pageUrl, chordProUrl } = toSongUrls(collection, collectionNumber);
  const chordProContent = await fetchChordPro(chordProUrl);

  if (chordProContent) {
    return {
      success: true,
      song: parseSongFromChordPro(collection, collectionNumber, chordProContent),
    };
  }

  const pageResult = await fetchText(pageUrl, "text/html, */*;q=0.5");

  if (!pageResult) {
    return {
      success: false,
      failure: {
        collection: collection.code,
        collectionNumber,
        reason: "missing_page_and_chordpro",
      },
    };
  }

  const pageSong = extractPageSongData(pageResult.text);

  if (!pageSong?.text?.title) {
    return {
      success: false,
      failure: {
        collection: collection.code,
        collectionNumber,
        reason: "missing_or_unusable_page_data",
      },
    };
  }

  return {
    success: true,
    song: parseSongFromPage(collection, collectionNumber, pageSong),
  };
}

async function buildSnapshot() {
  const collections = getRequestedCollections();
  const songs = [];
  const failures = [];

  for (const collection of collections) {
    for (
      let collectionNumber = 1;
      collectionNumber <= collection.maxNumber;
      collectionNumber += 1
    ) {
      const result = await importCollectionSong(collection, collectionNumber);

      if (result.success) {
        songs.push(result.song);
      } else {
        failures.push(result.failure);
      }
    }
  }

  songs.sort((left, right) => {
    if (left.collection === right.collection) {
      return (left.collectionNumber ?? 0) - (right.collectionNumber ?? 0);
    }

    return left.collection.localeCompare(right.collection);
  });

  return {
    generatedAt: new Date().toISOString(),
    source: "jemaf",
    collections: collections.map((collection) => ({
      key: collection.key,
      code: collection.code,
      label: collection.label,
      maxNumber: collection.maxNumber,
    })),
    importedCount: songs.length,
    skippedCount: failures.length,
    songs,
    failures,
  };
}

async function loadSnapshotFromDisk() {
  const content = await readFile(snapshotPath, "utf8");
  return JSON.parse(content);
}

async function saveSnapshot(snapshot) {
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

async function writeSeed(snapshot) {
  await writeFile(seedPath, renderSeedSql(snapshot.songs), "utf8");
}

async function main() {
  const mode = process.argv[2] ?? "fetch";

  if (mode === "render") {
    const snapshot = await loadSnapshotFromDisk();
    await writeSeed(snapshot);
    console.log(`Seed regenerated from ${path.relative(projectRoot, snapshotPath)}.`);
    return;
  }

  const snapshot = await buildSnapshot();
  await saveSnapshot(snapshot);
  await writeSeed(snapshot);

  console.log(
    `Imported ${snapshot.importedCount} songs from collections: ${snapshot.collections
      .map((collection) => collection.code)
      .join(", ")}.`,
  );

  if (snapshot.failures.length > 0) {
    console.log(
      `Skipped ${snapshot.failures.length} entries: ${snapshot.failures
        .map(
          (failure) =>
            `${failure.collection} ${padCollectionNumber(failure.collectionNumber)}`,
        )
        .join(", ")}`,
    );
  }
}

await main();
