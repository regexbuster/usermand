/*
Todo List:
- Actual WordHooks content
- Reminders based on time
- To be determined
*/
const secrets = require('./secrets.js');

const Discord = require('discord.js');
const client = new Discord.Client();
const manager = client.users;

const {MongoClient} = require('mongodb');
const uri = `mongodb://${secrets.dbUsername}:${secrets.dbPassword}@usermand-shard-00-00.dqdim.mongodb.net:27017,usermand-shard-00-01.dqdim.mongodb.net:27017,usermand-shard-00-02.dqdim.mongodb.net:27017/myFirstDatabase?ssl=true&replicaSet=atlas-12q46r-shard-0&authSource=admin&retryWrites=true&w=majority`
const mongo = new MongoClient(uri, {useNewUrlParser:true, useUnifiedTopology:true});

process.stdin.resume();//so the program will not close instantly

async function exitHandler(options, exitCode) {
	await mongo.close();
    client.destroy();
    process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

client.on('ready', () => {
	console.log(secrets.dbUsername)
	main().catch(console.error);
	console.log(`Logged in as ${client.user.tag}`)
})

client.on('message', async (msg) => {
	let msgSplit = msg.content.split(' ');

	if(msgSplit[0] === 'um+test'){
		// const u = await manager.fetch('354738945965162496',false,false)
		// console.log(u)
		console.log('90')
		let res = await msg.guild.members.fetch('407026273332887552');
		console.log(res.user)
	}
	else if(msgSplit[0] === 'um+add'){
		await addHook(msg.author, msgSplit[1])
	}
	else if(msgSplit[0] === 'um+remove'){
		if(Number.isInteger(parseInt(msgSplit[1]))){
			await removeHook(msg.author, parseInt(msgSplit[1]))
		}
		else{
			msg.reply(" something in you command seems invalid. You need to use an index number based on the list command!")
		}
	}
	else if(msgSplit[0] === 'um+list'){
		await listHooks(msg.author, msg)
	}
	else if(msgSplit[0] === 'um+help'){
		msg.reply('Rerun this command at any time if you need more help! \n```um+add <word> : adds a word to your word hooking list \num+remove <index number> : removes hooked word at the index of your word list \num+list : lists all of your current words```')
	}
	else if(msgSplit[0] === 'um+close'){
		client.destroy()
	}
	else{
		doPings(msg);
	}
})

async function main(){
	try{
		await mongo.connect();
	}
	catch(e){
		console.error(e);
	}
}

async function sendDM(user, mess){
	var dmc = user.dmChannel;
	if(dmc === null){
		dmc = await user.createDM();
	}
	dmc.send(mess).catch(console.error);
}

async function doPings(msg){
	let results = await mongo.db("wordhooking").collection("hookers").find({}).toArray();
	results.forEach(async (hooker) => {
		hooker['hooks'].forEach(async (x) => {
			if(msg.content.toLowerCase().includes(x.toLowerCase())){
				const usr = await client.users.fetch(hooker['name'],false,false)
				const dmEmbed = new Discord.MessageEmbed().setTitle(`I found your hooked word: ${x}`).setDescription(`Check it out here \n${msg.url}`)
				sendDM(usr, dmEmbed)
			}
		})
	})	
}

async function addHook(user, hook){
	//grab the current document based on user id
	const currentHooks = await mongo.db("wordhooking").collection("hookers").findOne({ name: user.id })

	//if there is a document for this user
	if(currentHooks !== null){
		//create a copy of the current document and delete the id for update fixing
		let updatedHooks = JSON.parse(JSON.stringify(currentHooks))
		delete updatedHooks['_id']

		//add the new word to be hooked and then update the current document
		updatedHooks.hooks.push(hook)
		const result = await mongo.db("wordhooking").collection("hookers").updateOne({ name: user.id }, {$set: updatedHooks})
	}
	else{
		//create a new document with the user's discord id and the first hooked word
		const result = await mongo.db("wordhooking").collection("hookers").insertOne({
			name: user.id,
			hooks: [hook]
		});
	}
}

async function removeHook(user, hookNum){
	//grab the current document based on user id
	const currentHooks = await mongo.db("wordhooking").collection("hookers").findOne({ name: user.id })

	//if there is a document for this user
	if(currentHooks !== null){
		//create a copy of the current document and delete the id for update fixing
		let updatedHooks = JSON.parse(JSON.stringify(currentHooks))
		delete updatedHooks['_id']

		//add the new word to be hooked and then update the current document
		updatedHooks.hooks.splice(hookNum, 1)
		const result = await mongo.db("wordhooking").collection("hookers").updateOne({ name: user.id }, {$set: updatedHooks})
	}
	else{
		msg.reply(' you have no hooks! Try to add one before calling this command.')
	}
}

async function listHooks(user, msg){
	//find the the current document of the user
	let result = await mongo.db("wordhooking").collection("hookers").findOne({ name: user.id })
	
	//if there is actually a document
	if(result !== null){
		//create a monospaced message containing all of the currently held hooks
		let message = '```'
		result['hooks'].forEach((x,i) => {
			message += `${i}: ${x}\n`
		})
		message += '```'

		//return an embed
		const hookEmbed = new Discord.MessageEmbed().setTitle(`Your Hooked Words (${user.username}#${user.discriminator})`).setDescription(message)
		msg.channel.send(hookEmbed);	
	}
	else{
		msg.reply(' you have no hooks! Try to add one before calling this command.')
	}
}

client.login(secrets.disToken);