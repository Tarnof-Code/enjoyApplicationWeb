import React, { useState } from "react";
import { Form, FormGroup, Label, Input, Button } from "reactstrap";
import { Navigate } from "react-router-dom";
import styles from "./Connexion.module.scss";
import { accountService } from "../../services/account.service";
import { useNavigate } from "react-router-dom";
import store from "../../redux/store";
import { setUser } from "../../redux/auth/authSlice";

function Connexion() {
  let navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    email: "",
    motDePasse: "",
  });

  const onChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async () => {
    try {
      const response = await accountService
        .login(credentials)
        .then((response) => {
          console.log(response.data);
          accountService.saveAccessToken(response.data.access_token);
          navigate("/dashboard", { replace: true });
        });
      console.log("Connexion réussie");
    } catch (error) {
      console.error("Erreur lors de la connexion", error);
    }
  };

  if (accountService.isLogged()) return <Navigate to="/dashboard" />;

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
            onChange={onChange}
          />
        </FormGroup>
        <FormGroup>
          <Label for="passwordConnexion">Mot de passe</Label>
          <Input
            id="passwordConnexion"
            name="motDePasse"
            placeholder="Renseignez votre mot de passe"
            type="password"
            onChange={onChange}
          />
        </FormGroup>
        <Button onClick={handleLogin}>Se connecter</Button>
      </Form>
    </div>
  );
}

export default Connexion;
