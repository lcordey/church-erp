# Notifications push

## Périmètre livré

Un utilisateur connecté se voit proposer l’activation des notifications sur
chaque nouvel appareil compatible. Il peut aussi les activer ou les désactiver
depuis « Réglages ». L’autorisation et l’abonnement restent propres à l’appareil
: le même compte peut donc être abonné à la fois sur son téléphone et son iPad.

Les catégories suivantes sont activées par défaut sur chaque nouvel abonnement :

- ajout à l’équipe d’un événement ;
- ajout, remplacement ou retrait de la setlist d’un événement auquel
  l’utilisateur est affecté.

Chaque catégorie peut être désactivée indépendamment dans « Réglages ». Un
toucher ouvre directement la fiche de l’événement.

La notification d’affectation n’est pas renvoyée lors d’une simple modification
de l’événement ou du rôle d’une personne déjà affectée. La personne qui crée ou
modifie l’événement n’est pas notifiée par cette modification. Un échec du
fournisseur push ne bloque jamais l’enregistrement de l’événement.

## Sécurité et données

- le navigateur demande explicitement l’autorisation de l’utilisateur ;
- l’abonnement est associé au compte authentifié côté serveur ;
- la clé VAPID privée ne quitte jamais le serveur ;
- un endpoint expiré (`404` ou `410`) est supprimé automatiquement ;
- les tables ne sont pas directement accessibles aux rôles Supabase publics.

Les abonnements sont propres à l’appareil et peuvent être désactivés depuis la
page Réglages. Sur iOS, Web Push requiert l’application installée sur l’écran
d’accueil. Android et les navigateurs compatibles peuvent aussi proposer Web
Push hors mode installé.

## Hors périmètre

Les rappels programmés, notifications de modification/annulation hors setlist,
e-mails et centre de notifications seront ajoutés ultérieurement.
