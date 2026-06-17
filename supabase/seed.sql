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
  (
    '11111111-1111-4111-8111-111111111111',
    'J''aime l''Éternel',
    'jem-001-jaime-leternel',
    'published',
    'Katrina Evers - Katrina Evers',
    '© Spotlight Music. All rights reserved. International © Secured. Used by',
    'G',
    'JEM',
    1,
    'https://jemaf.fr/chant/jem001',
    false
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Quand je vois le ciel',
    'jem-002-quand-je-vois-le-ciel',
    'published',
    'Inconnu - C. Glardon',
    '© 1974 Adaptation française Christian Glardon',
    'C',
    'JEM',
    2,
    'https://jemaf.fr/chant/jem002',
    false
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'L''Éternel est mon berger',
    'jem-003-leternel-est-mon-berger',
    'published',
    'Philippe Aubert - Philippe Aubert',
    '© Ligue pour la Lecture de la Bible',
    'C',
    'JEM',
    3,
    'https://jemaf.fr/chant/jem003',
    false
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'Éternel ! Fais-moi connaître tes voies',
    'jem-004-eternel-fais-moi-connaitre-tes-voies',
    'published',
    'Pierre van Woerden - Pierre van Woerden',
    '© 1976 Gerth Medien Musikverlag',
    'C',
    'JEM',
    4,
    'https://jemaf.fr/chant/jem004',
    false
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'Je t''instruirai et je te montrerai',
    'jem-005-je-tinstruirai-et-je-te-montrerai',
    'published',
    'Alfred Kuen - Alfred Kuen',
    '© 1971 Editions Joie de vivre',
    'D',
    'JEM',
    5,
    'https://jemaf.fr/chant/jem005',
    false
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'Que ma bouche chante ta louange',
    'que-ma-bouche-chante-ta-louange',
    'published',
    'Communauté de l''Emmanuel',
    '© Communauté de l''Emmanuel',
    'D',
    'LeMont',
    null,
    null,
    true
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'Bénissez le Seigneur',
    'benissez-le-seigneur',
    'published',
    null,
    null,
    'Em',
    'LeMont',
    null,
    null,
    true
  ),
  (
    '88888888-8888-4888-8888-888888888888',
    'Chant en préparation',
    'chant-en-preparation',
    'published',
    'Équipe louange',
    null,
    'C',
    'LeMont',
    null,
    null,
    true
  )
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
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'chordpro',
    'active',
    $chordpro${t: J'aime l'Éternel}
{st: Katrina Evers - Katrina Evers}
{c: © Spotlight Music. All rights reserved. International © Secured. Used by}
{c: jemaf.fr – 12/06/20 – JEM001}
{key: G}

{c: Refrain}
{start_of_chorus}
[G]J'aime l'Éter[Em]nel, car [Am]Il entend ma [D7]voix ;
[G]Il a pen[Em]ché son o[Am]reille vers [D7]moi ;
[G]Je l'invoque[Em]rai [Am]toute ma [D7]vie.
[G]J'aime l'Éter[Em]nel, [Am]j'aime [D7]l'Éter[G]nel.
{end_of_chorus}

{c: Strophe}
{start_of_verse}
[Em]Il a délivré mon âme de la mort,
Mes [Am]yeux des lar[D7]mes,
Mes pieds de la [G]chute.
[Em]L'Éternel [B7]est [Em]miséricordi[Am]eux et [D7]juste,
[G]Il est [Em]plein de [Am]com[D7]pas[G]sion, 
[G]Il est [Em]plein de [Am]com[D7]pas[G]sion.
{end_of_verse}

{c: Refrain}
{start_of_chorus}
[G]J'aime l'Éter[Em]nel, car [Am]Il entend ma [D7]voix ;
[G]Il a pen[Em]ché son o[Am]reille vers [D7]moi ;
[G]Je l'invoque[Em]rai [Am]toute ma [D7]vie.
[G]J'aime l'Éter[Em]nel, [Am]j'aime [D7]l'Éter[G]nel.
{end_of_chorus}$chordpro$,
    'https://jemaf.fr/ressources/chordPro/jem001.chordpro'
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'chordpro',
    'active',
    $chordpro${t: Quand je vois le ciel}
{st: Inconnu - C. Glardon}
{c: © 1974 Adaptation française Christian Glardon}
{c: jemaf.fr – 12/06/20 – JEM002}
{key: C}

{c: Refrain}
{start_of_chorus}
[C]Quand je vois le [C7]ciel,
[F]Oeuvre [F#d]de tes [C]doigts,
La lune et [Am]les étoiles [D7]que tu cré[G]as.

[C]Quand je vois le [C7]ciel,
[F]Oeuvre [F#d]de tes [C]doigts,
La lune et [Am]les étoiles [Dm]que tu [G7]cré[C]as.
{end_of_chorus}

{c: Strophe}
{start_of_verse}
[F]Qu'est donc l'homme, ô [F#d]Éternel ?
[C]Qu'est donc l'homme, ô [Am]Éternel ?
[D7]Qu'est donc l'homme, ô Éternel ?
[G]Que tu prennes [G7]garde à lui ?
{end_of_verse}

{c: Refrain}
{start_of_chorus}
[C]Quand je vois le [C7]ciel,
[F]Oeuvre [F#d]de tes [C]doigts,
La lune et [Am]les étoiles [D7]que tu cré[G]as.

[C]Quand je vois le [C7]ciel,
[F]Oeuvre [F#d]de tes [C]doigts,
La lune et [Am]les étoiles [Dm]que tu [G7]cré[C]as.
{end_of_chorus}$chordpro$,
    'https://jemaf.fr/ressources/chordPro/jem002.chordpro'
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    '33333333-3333-4333-8333-333333333333',
    'chordpro',
    'active',
    $chordpro${t: L'Éternel est mon berger}
{st: Philippe Aubert - Philippe Aubert}
{c: © Ligue pour la Lecture de la Bible}
{c: jemaf.fr – 12/06/20 – JEM003}
{key: C}

{c: Strophe}
{start_of_verse}
L'Éter[C]nel est mon berger,
Je ne manquerai de [F]rien.
Je ne [C]crains aucun [G]mal,
car [C]Il est avec [G]moi.

[G]Allélu[C]ia !
{end_of_verse}$chordpro$,
    'https://jemaf.fr/ressources/chordPro/jem003.chordpro'
  ),
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    '44444444-4444-4444-8444-444444444444',
    'chordpro',
    'active',
    $chordpro${t: Éternel ! Fais-moi connaître tes voies}
{st: Pierre van Woerden - Pierre van Woerden}
{c: © 1976 Gerth Medien Musikverlag }
{c: jemaf.fr – 12/06/20 – JEM004}
{key: C}

{c: Refrain}
{start_of_chorus}
Éter[C]nel ! fais-moi con[G7]naître tes [C]voies, [C7]
En[F]seigne-[A]moi tes sen[Dm]tiers. [G7]
Con[C]duis-moi [E7]dans ta [A]véri[Dm]té,
Et ins[C]truis-moi, et ins[G]truis-[C]moi.
{end_of_chorus}

{c: Strophe}
{start_of_verse}
Car [F]Tu es le Dieu de [Em]mon salut,
[Dm]Tu es le [G7]Dieu de [C]mon sa[Am]lut,
Tu es [Dm]toujours [G7]mon espé[C]ran[Am]ce,
Tu es tou[Dm]jours [D7]mon espé[G7]rance.
{end_of_verse}

{c: Refrain}
{start_of_chorus}
Éter[C]nel ! fais-moi con[G7]naître tes [C]voies, [C7]
En[F]seigne-[A]moi tes sen[Dm]tiers. [G7]
Con[C]duis-moi [E7]dans ta [A]véri[Dm]té,
Et ins[C]truis-moi, et ins[G]truis-[C]moi.
{end_of_chorus}$chordpro$,
    'https://jemaf.fr/ressources/chordPro/jem004.chordpro'
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    '55555555-5555-4555-8555-555555555555',
    'chordpro',
    'active',
    $chordpro${t: Je t'instruirai et je te montrerai}
{st: Alfred Kuen - Alfred Kuen}
{c: © 1971 Editions Joie de vivre}
{c: jemaf.fr – 12/06/20 – JEM005}
{key: D}

{c: Strophe}
{start_of_verse}
[D]Je t'instrui[D7]rai et je te [G]montre[D]rai
La voie que [G]tu dois [A]suivre ;
[Em]Je te con[A7]seille[D]rai,
J'au[G]rai le re[D]gard sur [A]toi.
[D]Je te con[A]seille[Bm]rai,
[G]J'au[Bm]rai le re[G]gard [A]sur [D]toi.
{end_of_verse}$chordpro$,
    'https://jemaf.fr/ressources/chordPro/jem005.chordpro'
  ),
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    '66666666-6666-4666-8666-666666666666',
    'chordpro',
    'active',
    $chordpro${title: Que ma bouche chante ta louange}
{key: D}

{comment: Couplet}
[D]Que ma bouche chante ta [G]louange,
[Bm]Que mon cœur célèbre ton [A]nom.

{comment: Refrain}
[G]Sois béni, Seigneur, pour ta [D]fidélité,
[Em]Ta présence renouvelle ma [A]joie.$chordpro$,
    null
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    '77777777-7777-4777-8777-777777777777',
    'chordpro',
    'active',
    $chordpro${title: Bénissez le Seigneur}
{key: Em}

{comment: Refrain}
[Em]Bénissez le Seigneur,
[C]Vous tous serviteurs du Sei[D]gneur.
[G]Levez les mains vers lui,
[Am]Et célébrez son [B7]nom.$chordpro$,
    null
  ),
  (
    '12121212-1212-4212-8212-121212121212',
    '88888888-8888-4888-8888-888888888888',
    'chordpro',
    'active',
    $chordpro${title: Chant en préparation}
{key: C}

{comment: Couplet}
[C]Voici un chant préparé pour l'équipe,
[F]Simple brouillon devenu exemple local.

{comment: Refrain}
[Am]Que nos voix s'accordent,
[F]Pour servir avec [G]joie.$chordpro$,
    null
  )
on conflict (id) do update set
  song_id = excluded.song_id,
  source_type = excluded.source_type,
  status = excluded.status,
  text_content = excluded.text_content,
  external_url = excluded.external_url,
  updated_at = now();
