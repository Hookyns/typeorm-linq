import {Connection, createConnection} from "typeorm";
import SelectBuilder                  from "./SelectBuilder";

(async () =>
{
	let connection: Connection;

	try
	{
		connection = await createConnection();

		await new SelectBuilder().init();
	} 
	catch (e)
	{
		console.error(e);
	} 
	finally
	{
		await connection.close();
	}
})();