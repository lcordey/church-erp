# Notifications push

## Périmètre livré

Un utilisateur connecté peut activer les notifications depuis « Réglages » sur
chaque appareil compatible. Lorsqu’il est nouvellement ajouté à l’équipe d’un
événement, tous ses appareils abonnés reçoivent une notification. Un toucher
ouvre directement la fiche de l’événement.

La notification n’est pas renvoyée lors d’une simple modification de
l’événement ou du rôle d’une personne déjà affectée. Un échec du fournisseur
push ne bloque jamais l’enregistrement de l’événement.

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

Les rappels programmés, notifications de modification/annulation, préférences
par type, e-mails et centre de notifications seront ajoutés ultérieurement.
