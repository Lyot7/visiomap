# VisioMap

Mon projet permet d'afficher la position des utilisateurs en temps réel, de faire des appels de visioconférence entre eux et d'afficher l'accélération de ceux-ci.

## Étapes pour utiliser l'application

1. **Cloner le repository**

   ```bash
   git clone https://github.com/Lyot7/visiomap.git
   ```

2. **Se placer dans le dossier du projet**

   ```bash
   cd visiomap
   ```

3. **Installer les dépendances**

   ```bash
   npm i
   ```

4. **Build le projet**

   ```bash
   npm run build
   ```

5. **Lancer le projet**

   ```bash
   npx serve@latest out
   ```

6. **Démarrer le serveur dans un autre terminal**

   ```bash
   node src/server/server.js
   ```

7. **Se connecter à l'application**  
   Utilisez le lien donné par la commande `npx serve@latest out`.

## Architecture du projet

Le projet est composé de plusieurs dossiers principaux :

- **src/app**  
  Point d'entrée de l'application. Le fichier `page.tsx` sert d'index et appelle les différents composants ou hooks nécessaires au bon fonctionnement de la page.
- **src/components**  
  Contient les composants du projet (fonctions permettant de gérer et afficher les données dans l'interface).
- **src/hooks**  
  Contient les hooks du projet (fonctions qui renvoient des données sans fournir d'affichage direct).
- **src/server**  
  Gère la connexion, les utilisateurs, leurs données ainsi que la communication entre eux.

Le dossier **out** contient l'application build.

## Technologies utilisées

Pour ce projet, j'ai utilisé une stack **Next.js**, **React**, **TypeScript**, **Tailwind CSS** et **Node.js** car je la connais bien et pour une gestion efficace de l'affichage en temps réel et des rechargements de composants de l'interface (re-renders) offerts par React.

### Hooks et Concepts React

- **useState**  
  Utilisé pour gérer les données et déclencher un rechargement via `useEffect` ou pour partager des états entre un parent et son enfant.

- **useEffect**

  - _Sans paramètre_ : Permet d'initialiser des fonctions, des écouteurs ou une configuration de base au chargement de la page.
  - _Avec paramètres_ : Permet de re-render le composant lors d'un changement de valeur dans le state, sans recharger la page ni provoquer une nouvelle connexion au serveur.

- **useRef**  
  Permet de stocker une valeur mutable qui persiste pendant tout le cycle de vie du composant sans provoquer de re-renders.

- **useCallback**  
  Permet de mémoriser une fonction pour éviter sa recréation à chaque rechargement de page.

### Autres Technologies et API

- **MapBox API**  
  Utilisée pour afficher la carte et les positions des utilisateurs via l'ajout de layers.

- **WebRTC**  
  Permet de connecter deux utilisateurs en visioconférence grâce à l'envoi de requêtes au serveur (fonctionnant comme un relais).

- **DeviceMotionEvent**  
  Utilisé pour récolter les données de l'accéléromètre et les reformater afin d'afficher la vitesse de l'utilisateur (l'accéléromètre indique l'accélération, pas directement la vitesse).
