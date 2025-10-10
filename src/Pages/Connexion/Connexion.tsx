import { useState } from "react";
import { Form, FormGroup, Input, Button } from "reactstrap";
import { Navigate } from "react-router-dom";
import styles from "./Connexion.module.scss";
import { accountService } from "../../services/account.service";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";

function Connexion() {
  let navigate = useNavigate();

  const [credentials, setCredentials] = useState({
    email: "",
    motDePasse: "",
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onChange = (e: any) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async () => {
    try {
      const response = await accountService.login({
        ...credentials,
        password: credentials.motDePasse
      });
      console.log(response.data);
      accountService.saveAccessToken(response.data.access_token);
      navigate("/profil", { replace: true });
    } catch (error) {
      console.error("Erreur lors de la connexion", error);
      if (error instanceof AxiosError && error.response?.status === 401) {
        setErrorMessage("Email ou mot de passe incorrect");
      } else {
        setErrorMessage("Une erreur s'est produite lors de la connexion");
      }
    }
  };

  if (accountService.isLogged()) return <Navigate to="/profil" />;

  return (
    <div className={styles.main}>
      <div className={styles.titre}>
        <p>Enjoy</p>
      </div>
      <div className={styles.login}>
        <h4>Connexion</h4>
        <Form className={styles.form}>
          <FormGroup className={styles.form_group}>
            <Input
              id="emailConnexion"
              name="email"
              placeholder="Email"
              type="email"
              onChange={onChange}
            />
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Input
              id="passwordConnexion"
              name="motDePasse"
              placeholder="Mot de passe"
              type="password"
              onChange={onChange}
            />
          </FormGroup>
          <Button className={styles.bouton} onClick={handleLogin}>
            Se connecter
          </Button>
        </Form>
        <p className="errorMessage">{errorMessage}</p>
      </div>
    </div>
  );
}

export default Connexion;
