import { FormGroup, Input, Button } from "reactstrap";
import { Form as RouterForm, redirect, useActionData, useNavigation, Navigate, ActionFunctionArgs } from "react-router-dom";
import styles from "./Connexion.module.scss";
import { accountService } from "../../services/account.service";
import { AxiosError } from "axios";

export async function loginAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const motDePasse = formData.get("motDePasse") as string;

  if (!email || !motDePasse) {
    return "Veuillez remplir tous les champs";
  }

  try {
    const response = await accountService.login({
      email,
      motDePasse: motDePasse
    } as any);
    accountService.saveAccessToken(response.data.access_token);
    return redirect("/profil");
  } catch (error) {
    console.error("Erreur lors de la connexion", error);
    if (error instanceof AxiosError && error.response?.status === 401) {
      return "Email ou mot de passe incorrect";
    } else {
      return "Une erreur s'est produite lors de la connexion";
    }
  }
}

function Connexion() {
  const errorMessage = useActionData() as string;
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  if (accountService.isLogged()) return <Navigate to="/profil" />;

  return (
    <div className={styles.main}>
      <div className={styles.titre}>
        <p>Enjoy</p>
      </div>
      <div className={styles.login}>
        <h4>Connexion</h4>
        {/* On utilise RouterForm au lieu de Form de reactstrap pour englober le tout */}
        <RouterForm method="post" className={styles.form}>
          <FormGroup className={styles.form_group}>
            <Input
              id="emailConnexion"
              name="email"
              placeholder="Email"
              type="email"
              required
            />
          </FormGroup>
          <FormGroup className={styles.form_group}>
            <Input
              id="passwordConnexion"
              name="motDePasse"
              placeholder="Mot de passe"
              type="password"
              required
            />
          </FormGroup>
          <Button 
            className={styles.bouton} 
            type="submit" // Important : type="submit" déclenche l'action
            disabled={isSubmitting}
          >
            {isSubmitting ? "Connexion en cours..." : "Se connecter"}
          </Button>
        </RouterForm>
        {errorMessage && <p className="errorMessage" style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</p>}
      </div>
    </div>
  );
}

export default Connexion;
