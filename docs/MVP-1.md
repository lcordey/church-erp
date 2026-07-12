# MVP-1

## Objectif

Livrer la plus petite application utile pour l'equipe louange, tout en validant toute la verticalite locale :
- application Next.js
- PostgreSQL local via Supabase
- logique metier cote serveur
- fonctionnalites connectees a la base
- tests locaux
- utilisation confortable sur telephone

Cette phase est volontairement etroite. Ce n'est pas encore l'ERP complet de l'eglise.

## Utilisateurs cibles

Seule l'equipe louange utilise l'application dans le MVP-1.

Hypothese operationnelle :
- l'equipe louange utilise des comptes persistants pour les outils internes
- les groupes systeme Louange et Admin distribuent des permissions distinctes et cumulables

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
- support d'une partition MusicXML optionnelle par chant
- liens d'ecoute YouTube et Spotify optionnels par chant
- chants officiels JEMAF stockes en lecture seule avec provenance JEMAF
- snapshot local de recueils JEMAF regenerable puis rejouable hors ligne
- recherche simple par titre ou numero de recueil
- filtre du catalogue par recueil via cases a cocher
- themes et labels administrables, associables en nombre quelconque aux chants
- filtres du catalogue par theme et label
- collection locale temporaire `LeMont` pour les chants propres a l'eglise
- recherche fluide cote client sur la page catalogue
- notation musicale anglaise ou francaise
- transposition temporaire a la lecture sans modifier la source

### Mobile
- interface responsive pour telephone
- test local dans le navigateur d'un telephone
- bouton d'installation PWA affiche dans le site quand le navigateur Android
  confirme que l'application est installable
- notification au lancement de l'application installee quand une nouvelle
  version PWA est disponible
- notifications push opt-in lorsqu'un utilisateur est nouvellement affecte a
  un evenement, avec ouverture directe de sa fiche

### Qualite locale
- migrations de base de donnees
- donnees de seed reproductibles hors ligne
- tests unitaires sur les regles metier utiles
- smoke test HTTP sur les parcours principaux
- tests navigateur Playwright a ajouter

## Hors perimetre explicite

- recuperation autonome de mot de passe et invitations par e-mail
- groupes et permissions personnalisables
- autres formats de partitions ou de documents hors PDF et MusicXML
- calendrier mensuel, recurrence et agenda structure
- invitations a un evenement
- partage de chants a des participants
- lectures bibliques attachees a un evenement
- gestion des benevoles
- emails et rappels
- projection media
- mode hors ligne avance
- packaging mobile natif

## Regles produit du MVP-1

- les visiteurs publics ne peuvent lire que les chants publies
- les visiteurs non connectes ne peuvent consulter que les accords et paroles
- les PDF, MusicXML et écritures sur les setlists exigent un compte autorisé
- les événements sont lisibles publiquement, avec des actions supplémentaires selon les permissions du compte connecté
- les comptes connectes recoivent les permissions cumulees de leurs groupes Louange et Admin
- les utilisateurs internes peuvent creer et modifier des chants
- toutes les ecritures passent par des frontieres serveur
- les cas d'usage publics, Louange et Admin restent distingues à chaque frontière serveur
- l'interface utilisateur est en francais
- le code reste en anglais

## Ordre de livraison recommande

1. catalogue public des chants en ChordPro - livre
2. administration des chants - livre
3. acces et verifications mobile - livre

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
- copyright, numero de recueil, URL officielle et verrouillage partiel des metadonnees de provenance pour les chants officiels JEMAF
- recherche publique par titre ou numero de recueil
- filtre public par recueil, incluant les recueils JEMAF importes et `LeMont`
- filtres publics par theme et label
- administration des referentiels de themes et labels et associations aux chants
- creation admin assignee automatiquement a la collection `LeMont`
- donnees de seed composees d'un snapshot local du catalogue public JEMAF et de chants locaux editables `LeMont`
- partition PDF optionnelle stockee dans Supabase Storage et servie par route backend
- partition MusicXML optionnelle stockee en base et rendue en mode `Partition`
- creation, edition, suppression et lecture de setlists de chants publies
- notes d'equipe et notes personnelles par occurrence de chant dans le lecteur de setlist
- comptes persistants, groupes Louange/Admin et sessions revocables
- evenements internes avec setlist, notes, affectations et filtre Mes services
- migrations, seed, tests Vitest et smoke test HTTP
- acces local depuis un telephone avec HTTPS et support WSL2

Restant pour terminer MVP-1 :
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
