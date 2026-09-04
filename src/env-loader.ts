import 'dotenv/config';



const Env = {
  PORT: process.env.PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  DB_FILE_NAME: process.env.DB_FILE_NAME,
  SECRET: process.env.SECRET,
};

export default Env;
