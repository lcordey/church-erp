# MVP-1

## Objectif

Livrer la plus petite application utile pour l'equipe louange, tout en validant toute la verticalite locale :
- application Next.js
- PostgreSQL local via Supabase
- logique metier cote serveur
- fonctionnalites connectees a la base
- tests locaux
- utilisation confortable sur telephone
- structure compatible avec une future PWA

Cette phase est volontairement etroite. Ce n'est pas encore l'ERP complet de l'eglise.

## Utilisateurs cibles

Seule l'equipe louange utilise l'application dans le MVP-1.

Hypothese operationnelle :
- tous les utilisateurs reels sont traites comme administrateurs
- il n'y a pas encore besoin de gerer des comptes, groupes ou permissions fines

Contrainte d'architecture :
- les actions d'administration doivent tout de meme rester identifiables comme des actions privilegiees pour pouvoir ajouter de vraies restrictions plus tard

## Criteres de reussite

Le MVP-1 est reussi s'il prouve que le projet peut :
- stocker de vraies donnees de chants en local
- exposer en securite les chants publies
- permettre des workflows internes d'administration
- fonctionner localement sur ordinateur et sur telephone
- rester pret pour l'authentification future, plusieurs formats de chants et des modules supplementaires

## Dans le perimetre

### Fondations
- regles projet dans `AGENTS.md`
- documentation d'architecture et de setup
- documentation par fonctionnalite
- workflow local de developpement en style Linux-first ou WSL-first

### Chants
- catalogue public des chants publies
- page detail d'un chant publie
- creation, modification, publication, retrait et suppression des brouillons
- support initial du format ChordPro
- support d'une partition PDF optionnelle par chant
- chants officiels JEMAF stockes en lecture seule avec provenance JEMAF
- snapshot local de recueils JEMAF regenerable puis rejouable hors ligne
- recherche simple par titre ou numero de recueil
- filtre du catalogue par recueil via cases a cocher
- collection locale temporaire `LeMont` pour les chants propres a l'eglise
- recherche fluide cote client sur la page catalogue
- notation musicale anglaise ou francaise
- transposition temporaire a la lecture sans modifier la source

### Mobile et compatibilite PWA
- interface responsive pour telephone
- test local dans le navigateur d'un telephone
- installation PWA de base avec prompt navigateur quand disponible

### Qualite locale
- migrations de base de donnees
- donnees de seed reproductibles hors ligne
- tests unitaires sur les regles metier utiles
- smoke test HTTP sur les parcours principaux
- tests navigateur Playwright a ajouter

## Hors perimetre explicite

- authentification reelle
- groupes, roles et administration des permissions
- autres formats de partitions ou de documents
- evenements et calendrier
- invitations a un evenement
- partage de chants a des participants
- lectures bibliques attachees a un evenement
- gestion des benevoles
- emails et rappels
- projection media
- mode hors ligne avance
- notifications push
- packaging mobile natif

## Regles produit du MVP-1

- les visiteurs publics ne peuvent lire que les chants publies
- les utilisateurs internes peuvent creer et modifier des chants
- toutes les ecritures passent par des frontieres serveur
- les cas d'usage publics et admin doivent rester distingues meme si la meme personne peut actuellement tout faire
- l'interface utilisateur est en francais
- le code reste en anglais

## Ordre de livraison recommande

1. catalogue public des chants en ChordPro - livre
2. administration des chants - livre
3. acces et verifications mobile - livre
4. premiere couche PWA - livre

## Etat actuel

Livre :
- catalogue et detail publics limites aux chants publies
- rendu ChordPro avec notation anglaise ou francaise
- transposition temporaire pour les musiciens
- bascule coherente entre modes selection et edition
- creation et modification de brouillons
- action enregistrer et publier
- publication, retrait et suppression securisee des brouillons
- champs YAGNI retires du modele MVP-1: langue et titre original
- copyright, numero de recueil, URL officielle et verrouillage d'edition pour les chants officiels JEMAF
- recherche publique par titre ou numero de recueil
- filtre public par recueil, incluant les recueils JEMAF importes et `LeMont`
- creation admin assignee automatiquement a la collection `LeMont`
- donnees de seed composees d'un snapshot local du catalogue public JEMAF et de chants locaux editables `LeMont`
- partition PDF optionnelle stockee dans Supabase Storage et servie par route backend
- creation, edition, suppression et lecture de setlists de chants publies
- migrations, seed, tests Vitest et smoke test HTTP
- acces local depuis un telephone avec HTTPS et support WSL2

Restant pour terminer MVP-1 :
- validation d'installabilite
- tests navigateur Playwright des parcours principaux

## Standard de tranche verticale

Chaque fonctionnalite implementee devrait idealement inclure :
- schema ou migration si necessaire
- logique repository
- logique service
- endpoint ou frontiere serveur
- interface utilisateur
- tests pertinents

## Vision d'acceptation

A la fin du MVP-1, tu dois pouvoir :
- demarrer le projet localement
- l'ouvrir depuis un telephone sur le reseau local
- consulter publiquement les chants publies
- administrer les chants en interne
- changer temporairement la tonalite affichee sans modifier le chant
- executer les principales validations locales avec confiance
