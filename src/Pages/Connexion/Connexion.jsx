import React from "react";
import { Form, FormGroup, Label, Input, Button } from "reactstrap";

function Connexion() {
  return (
    <>
      <h1>Connexion</h1>
      <Form>
        <FormGroup>
          <Label for="exampleEmail">Email</Label>
          <Input
            id="emailConnexion"
            name="email"
            placeholder="Renseignez votre email"
            type="email"
          />
        </FormGroup>
        <FormGroup>
          <Label for="examplePassword">Password</Label>
          <Input
            id="passwordConnexion"
            name="password"
            placeholder="renseignez votre mot de passe"
            type="password"
          />
        </FormGroup>
        <Button>Se connecter</Button>
      </Form>
    </>
  );
}

export default Connexion;
