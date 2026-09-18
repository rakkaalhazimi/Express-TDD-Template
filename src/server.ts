import { initORM } from '@/db/db.js';
import env from '@/env-loader.js';
import { createApp } from '@/index.js';



const db = await initORM();
const app = await createApp(db);

app.listen(env.PORT, () => {
	console.log(`Server running on: http://localhost:${env.PORT}`);
});