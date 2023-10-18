import styles from './Accueil.module.scss';
import { useEffect, useState } from 'react'
import { fetchUtilisateurs } from '../../api/utilisateursApi';

function Accueil() {
    const [listUtilisateurs, setListUtilisateurs] = useState([]);
    const [loading, setLoading] = useState(true);
  
    useEffect(() => {
        async function getUtilisateurs() {
          try {
            const response = await fetchUtilisateurs(); // Utilisez la fonction fetchUtilisateurs
            setListUtilisateurs(response);
            setLoading(false);
          } catch (error) {
            console.error('Une erreur s\'est produite :', error);
            setLoading(false);
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
          <div>
            <h1>Liste des Utilisateurs</h1>
            {utilisateursItems}
          </div>
        )}
      </div>
    );
  }

export default Accueil;