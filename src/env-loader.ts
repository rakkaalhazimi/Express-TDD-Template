import 'dotenv/config';



const Env = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_FILE_NAME: process.env.DB_FILE_NAME,
  SECRET: process.env.SECRET,
  
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
  
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_REDIRECT_URI: process.env.GITHUB_REDIRECT_URI,
};

export default Env;
