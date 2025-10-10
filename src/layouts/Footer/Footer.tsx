import styles from "./Footer.module.scss";

const Footer: React.FC = () => {
  return (
    <footer className={styles.main}>
      <h1>{import.meta.env.VITE_APP_NAME || "Enjoy"} - Footer</h1>
    </footer>
  );
};

export default Footer;
