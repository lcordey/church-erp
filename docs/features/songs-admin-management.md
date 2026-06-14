# Feature: Administration des chants

## Objectif

Permettre aux utilisateurs internes de l'equipe louange de creer, modifier, publier et retirer de la publication des chants.

## Valeur utilisateur

- l'equipe louange peut maintenir son catalogue sans toucher directement a la base
- le projet obtient son premier workflow d'ecriture de type admin

## Perimetre

- creer un chant
- modifier un chant
- publier un chant
- retirer un chant de la publication
- consulter les metadonnees utiles cote administration

## Regles metier

- les actions d'administration sont des ecritures cote serveur meme si le MVP-1 traite actuellement tous les utilisateurs comme admins
- un chant doit posseder les champs requis avant publication
- publier un chant change sa visibilite publique
- retirer un chant de la publication le retire des resultats publics sans le supprimer
- un meme chant pourra a terme posseder plusieurs sources dans plusieurs formats

## Donnees concernees

Champs partages recommandes pour un chant :
- `id`
- `title`
- `slug`
- `language`
- `status`

Direction de modele recommandee :
- `songs` pour les metadonnees partagees
- `song_sources` pour les sources attachees a un chant

Pour MVP-1 :
- une source `ChordPro` est suffisante

Champs possibles plus tard, non requis maintenant :
- `key`
- `tempo`
- `theme`
- `copyright`

## Structure backend

Besoins probables :
- validation des entrees de creation et modification
- methodes de service pour creer, modifier, publier et retirer de la publication
- endpoints admin ou server actions pour les ecritures
- un helper d'autorisation explicite et permissif pendant le MVP-1
- une structure compatible avec l'ajout futur de sources PDF ou autres

## Structure UI

- liste admin des chants
- formulaire d'edition de chant
- controles de publication et de retrait de la publication
- feedback de validation en cas de saisie invalide

Contraintes UI :
- libelles et champs visibles en francais
- structure de composants sobre et facilement redesignable depuis Figma plus tard

## Tests

- tests unitaires sur les regles de publication
- tests API sur les flux de creation et modification
- test end-to-end de creation puis publication d'un chant

## Hors perimetre

- historique de revisions
- edition collaborative
- permissions granulaires
- support PDF
- export PDF
