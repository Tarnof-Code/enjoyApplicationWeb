import React, { useState } from "react";
import { Form, FormGroup, Label, Input, Button } from "reactstrap";
import { loginUser } from "../../api/connexionApi";
import { Navigate } from "react-router-dom";
import styles from "./Connexion.module.scss";

function Connexion() {
  const [formData, setFormData] = useState({
    email: "",
    motDePasse: "",
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  //  const dispatch = useDispatch();

  const handleLogin = async () => {
    try {
      const response = await loginUser(formData);
      console.log("Connexion réussie", response);
      setIsLoggedIn(true);
    } catch (error) {
      console.error("Erreur lors de la connexion", error);
    }
  };

  if (isLoggedIn) return <Navigate to="/profil" />;

  return (
    <div className={styles.main}>
      <h1>Connexion</h1>
      <Form>
        <FormGroup>
          <Label for="emailConnexion">Email</Label>
          <Input
            id="emailConnexion"
            name="email"
            placeholder="Renseignez votre email"
            type="email"
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </FormGroup>
        <FormGroup>
          <Label for="passwordConnexion">Mot de passe</Label>
          <Input
            id="passwordConnexion"
            name="password"
            placeholder="Renseignez votre mot de passe"
            type="password"
            onChange={(e) =>
              setFormData({ ...formData, motDePasse: e.target.value })
            }
          />
        </FormGroup>
        <Button onClick={handleLogin}>Se connecter</Button>
      </Form>
    </div>
  );
}

export default Connexion;
