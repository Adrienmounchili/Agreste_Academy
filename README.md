# Agreste Academy — LMS

Plateforme d'apprentissage (LMS) en **HTML / CSS / JavaScript + AJAX**, connectée à **Supabase**
(base de données + authentification + stockage de fichiers).

Trois types d'utilisateurs :

| Rôle | Peut faire |
|------|-----------|
| **Enseignant** (`teacher`) | Créer des cours, ajouter des leçons (PDF ou vidéo), ajouter une évaluation (QCM) à chaque leçon |
| **Étudiant** (`student`) | Suivre les leçons, passer les évaluations, voir sa progression (%), obtenir des certificats |
| **Promoteur** (`promoter`) | Créer des modules, rattacher les cours aux modules, suivre les certificats et les utilisateurs |

Quand un étudiant valide **tous les cours d'un module** (≥ 60 % par cours), un **certificat** est généré automatiquement.

---

## Fichiers exportables

```
index.html          → page principale
style.css           → styles (thème vert/or)
script.js           → toute la logique (auth, rôles, cours, évaluations, certificats)
config.js           → À ÉDITER : tes clés Supabase
supabase_schema.sql → script SQL à exécuter dans Supabase
public/logo.jpg     → logo Agreste Academy
```

C'est un site **100 % statique** : tu peux l'ouvrir tel quel, ou le déposer sur n'importe quel
hébergeur (Vercel, Netlify, GitHub Pages, ton propre serveur...).

---

## ✅ Ce que TU dois faire côté Supabase (étape par étape)

### 1. Créer un projet Supabase
1. Va sur https://supabase.com → **New project**.
2. Choisis un nom, un mot de passe de base de données, une région, puis crée le projet.

### 2. Créer les tables (base de données)
1. Dans le menu de gauche : **SQL Editor** → **New query**.
2. Copie tout le contenu du fichier **`supabase_schema.sql`** et colle-le.
3. Clique sur **Run**.
   → Ça crée les tables `profiles`, `modules`, `courses`, `lessons`, `evaluations`,
   `questions`, `attempts`, `certificates`, le trigger de création de profil, et toutes
   les règles de sécurité (RLS).

### 3. Créer le bucket de stockage (pour les PDF)
1. Menu de gauche : **Storage** → **New bucket**.
2. Nom du bucket : **`lessons`** (exactement ce nom).
3. Coche **Public bucket** (pour que les PDF soient lisibles dans le lecteur).
4. Crée le bucket.
5. Toujours dans Storage → onglet **Policies** du bucket `lessons`, ajoute une policy
   d'upload pour les utilisateurs connectés. Le plus simple :
   - Clique **New policy** → **For full customization** et utilise :
   ```sql
   -- INSERT (upload)
   create policy "upload_authenticated"
   on storage.objects for insert to authenticated
   with check ( bucket_id = 'lessons' );

   -- SELECT (lecture) — déjà couvert si le bucket est public
   create policy "read_lessons"
   on storage.objects for select
   using ( bucket_id = 'lessons' );
   ```
   (Tu peux aussi exécuter ces 2 blocs dans le SQL Editor.)

### 4. (Optionnel) Désactiver la confirmation par e-mail pour tester plus vite
- **Authentication** → **Sign In / Providers** → **Email** → désactive
  *"Confirm email"* si tu veux pouvoir te connecter immédiatement après inscription.
  (En production, laisse-la activée.)

### 5. Récupérer tes clés et les mettre dans `config.js`
1. **Project Settings** (roue dentée) → **Data API** / **API Keys**.
2. Copie :
   - **Project URL** → dans `config.js` → `SUPABASE_URL`
   - **anon public** → dans `config.js` → `SUPABASE_ANON_KEY`
   (⚠️ n'utilise PAS la clé `service_role`.)
3. Enregistre `config.js`.

Exemple :
```js
window.AGRESTE_CONFIG = {
  SUPABASE_URL: "https://abcd1234.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
  STORAGE_BUCKET: "lessons",
};
```

---

## ▶️ Lancer / Tester

- En local : ouvre simplement `index.html` (ou sers le dossier avec n'importe quel serveur statique).
- Crée d'abord un compte **Promoteur** → crée 1 ou 2 **modules**.
- Crée un compte **Enseignant** → crée un **cours**, ajoute des **leçons** (PDF/vidéo) + **évaluations**.
- Le promoteur rattache le cours au module (page *Cours*).
- Crée un compte **Étudiant** → suis les leçons, passe les évaluations.
  Quand tous les cours d'un module sont validés, le certificat apparaît dans *Mes certificats*.

---

## 📦 Quoi m'envoyer si tu as un souci

Si quelque chose ne marche pas, envoie-moi :
1. Le **message d'erreur exact** affiché (un encadré jaune apparaît dans l'app).
2. Une capture de l'écran concerné.
3. Confirme que le **script SQL** a bien été exécuté sans erreur et que le **bucket `lessons`** existe.

---

## Notes techniques
- Le QCM calcule la note (%) côté client puis enregistre la **tentative** (`attempts`).
- La **progression d'un cours** = moyenne des meilleures notes obtenues aux évaluations des leçons.
- Un module est considéré **validé** quand chaque cours du module est à ≥ 60 %.
- La sécurité repose sur les **politiques RLS** définies dans `supabase_schema.sql`
  (chaque étudiant ne voit que ses propres tentatives/certificats ; seuls enseignants/promoteurs
  peuvent créer du contenu).
