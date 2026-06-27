# Feature: Administration des chants

## Objectif

Permettre aux utilisateurs internes de l'equipe louange de creer, modifier,
publier automatiquement et supprimer des chants depuis leur ecran d'edition.

## Valeur utilisateur

- l'equipe louange peut maintenir son catalogue sans toucher directement a la base
- le projet obtient son premier workflow d'ecriture de type admin

## Perimetre

- creer un chant
- modifier un chant
- publier automatiquement a l'enregistrement
- supprimer definitivement un chant depuis son ecran d'edition
- ajouter, remplacer ou retirer une partition PDF attachee au chant
- ajouter, remplacer ou retirer une partition MusicXML attachee au chant
- generer une proposition de source ChordPro a partir du MusicXML attache
- consulter les metadonnees utiles cote administration
- consulter les chants officiels importes en lecture seule

## Regles metier

- les actions d'administration sont des ecritures cote serveur meme si le MVP-1 traite actuellement tous les utilisateurs comme admins
- un chant doit posseder les champs requis avant publication
- enregistrer un chant editable publie automatiquement sa version courante
- un chant publie doit d'abord etre retire du catalogue avant suppression ; l'interface peut enchainer ce retrait puis la suppression dans la meme action
- un meme chant pourra a terme posseder plusieurs sources dans plusieurs formats
- un chant MVP-1 possede au maximum une source ChordPro active, une source PDF active et une source MusicXML active
- les chants officiels JEMAF importes ne sont pas editables directement
- le verrouillage d'edition est applique cote service, pas seulement dans l'interface
- les chants crees manuellement dans MVP-1 sont automatiquement rattaches a la collection locale `LeMont`
- le choix de collection n'est pas visible dans le formulaire tant qu'il depend implicitement de l'eglise courante
- le formulaire pre-remplit actuellement `Auteur` et `Copyright` avec `LeMont`
- le template ChordPro de creation montre une structure type avec intro, couplet, refrain et pont
- le template ChordPro montre les repetitions via des commentaires visibles, par exemple `x2`
- le slug public reste gere automatiquement depuis le titre et n'est pas expose dans le formulaire
- les chants JEMAF seedes localement proviennent d'un snapshot JEMAF versionne puis rejoue hors ligne
- les accords saisis dans ChordPro doivent utiliser la notation anglaise et commencer par `A`, `B`, `C`, `D`, `E`, `F` ou `G`
- les alterations anglaises `#` et `b`, les suffixes mineurs et les basses slash comme `Bb`, `C#m` ou `F/A` sont acceptes
- les notes francaises comme `Do`, `Re`, `Ré`, `Mi`, `Fa`, `Sol`, `La` ou `Si` sont refusees dans les accords

## Donnees concernees

Champs partages recommandes pour un chant :
- `id`
- `title`
- `slug`
- `status`
- `author`
- `copyright`
- `collection`
- `collection_number`
- `source_page_url`
- `is_editable`

Direction de modele recommandee :
- `songs` pour les metadonnees partagees
- `song_sources` pour les sources attachees a un chant

Pour MVP-1 :
- une source `ChordPro` active est requise pour publier
- une source `PDF` active est optionnelle
- une source `MusicXML` active est optionnelle et stockee comme contenu texte en base
- quand une source `MusicXML` active existe, l'edition peut proposer une generation initiale de `ChordPro` sans enregistrer automatiquement le resultat
- la generation ChordPro separe les lignes de paroles MusicXML numerotees en couplets distincts
- les syllabes d'un meme mot sont reunies sans tiret de cesure
- les retours a la ligne suivent les changements de systeme indiques par la partition plutot que chaque mesure

Champs possibles plus tard, non requis maintenant :
- `tempo`
- `theme`
- `language`
- `original_title`
- contributeurs structures avec roles

## Structure backend

Implementation actuelle :
- validation des entrees a la frontiere HTTP
- service metier pour creer, modifier, publier et retirer de la publication
- repository Drizzle avec transaction pour creer le chant et sa source
- endpoints sous `/api/admin/songs`
- endpoints PDF sous `/api/admin/songs/:id/pdf`
- endpoints MusicXML sous `/api/admin/songs/:id/musicxml`
- endpoint de generation ChordPro sous `/api/admin/songs/:id/chordpro/generate`
- stockage PDF dans le bucket prive Supabase Storage `song-pdfs`
- helper d'autorisation explicite et permissif pendant le MVP-1
- conflits de slug retournes avec un statut HTTP `409`

## Structure UI

- catalogue principal en lecture avec action `Nouveau chant`
- formulaire d'edition de chant
- la bascule selection/edition reste disponible sur la page detail d'un chant ouvert
- la page detail d'un chant permet de passer entre lecture et edition sans revenir au catalogue
- le header de la page chant garde le retour au repertoire et la bascule selection/edition visibles
- action unique d'enregistrement avec publication automatique
- suppression d'un chant avec confirmation depuis l'ecran d'edition
- feedback de validation en cas de saisie invalide
- previsualisation ChordPro en direct
- tonalite validee avec affichage anglais ou francais
- affichage non editable pour les chants officiels importes
- rattachement automatique des nouveaux chants a `LeMont`
- aide initiale pour la syntaxe ChordPro supportee par le rendu
- template ChordPro base sur des directives nommees comme `{start_of_verse: Couplet 1}`
- validation bloquante des accords ChordPro avec message sous le champ source
- section `Partition PDF` pour ajouter, remplacer ou retirer le fichier attache
- section `Partition` pour ajouter, remplacer ou retirer le fichier MusicXML attache
- action `Generer depuis la partition` dans l'edition quand un MusicXML est disponible

Routes :
- `/admin/chants/nouveau`
- `/admin/chants/:id`
- `/admin/chants` redirige vers `/`

Interaction actuelle recommandee :
- le catalogue `/` sert de point d'entree principal pour ouvrir un chant en lecture
- le bouton `Nouveau chant` vit en permanence dans le header du catalogue
- les routes admin dediees restent utiles pour l'acces direct a la creation ou a une edition isolee

Contraintes UI :
- libelles et champs visibles en francais
- structure de composants sobre et facilement redesignable depuis Figma plus tard

## Tonalites et notation

- la base stocke une tonalite canonique comme `C`, `Bb` ou `F#m`
- la tonalite reste un texte valide par le domaine plutot qu'un enum PostgreSQL
- l'interface propose une liste de tonalites majeures et mineures supportees
- le toggle global affiche la notation anglaise (`A`, `B`, `C`) ou francaise (`La`, `Si`, `Do`)
- la preference d'affichage est conservee dans le navigateur
- les accords ChordPro sont convertis a l'affichage sans modifier la source

## Tests

- tests unitaires sur la validation et les regles de publication
- tests API sur la creation, le changement de publication et la suppression
- tests API sur l'ajout, le remplacement et la suppression de partition PDF
- tests API sur l'ajout, le remplacement et la suppression de partition MusicXML
- verification HTTP reelle du parcours creation, modification, publication, retrait et suppression
- test navigateur automatise reporte a l'installation de Playwright

## Hors perimetre

- historique de revisions
- edition collaborative
- permissions granulaires
- export PDF
