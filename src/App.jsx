import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [listUtilisateurs, setListUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUtilisateurs() {
      try {
        const brutResponse = await fetch("http://localhost:8080/utilisateurs");
        if (!brutResponse.ok) {
          throw new Error('Erreur de réseau');
        }
        const response = await brutResponse.json();
        setListUtilisateurs(response);
        setLoading(false); // Marquez le chargement comme terminé
      } catch (error) {
        console.error('Une erreur s\'est produite :', error);
        setLoading(false); // Assurez-vous de marquer le chargement comme terminé en cas d'erreur
      }
    }

    getUtilisateurs();
  }, []);

  // Vous pouvez mapper la liste d'utilisateurs pour les afficher
  const utilisateursItems = listUtilisateurs.map((utilisateur, index) => (
    <li key={index}>{utilisateur.nom} {utilisateur.prenom}</li>
  ));

  return (
    <div>
      {loading ? (
        <p>Chargement en cours...</p>
      ) : (
        <div>{utilisateursItems}</div>
      )}
    </div>
  );
}

export default App;