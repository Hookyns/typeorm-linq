import {createConnection} from "typeorm";
import SelectBuilder      from "./SelectBuilder";

(async () =>
{
	try
	{
		const connection = await createConnection();

		await new SelectBuilder().init();

		await connection.close();
	} catch (e)
	{
		console.error(e);
	}
})();