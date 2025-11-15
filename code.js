var myVersion = 0.60, myProductName = "wpInboundRss";

const appConsts = {
	urlFeedlandSocket: "wss://feedland.social/",
	flStripHtmlInMarkdownText: true,
	
	theSites: [
		{
			feedUrl: "http://scripting.com/rss.xml",
			idSite: 223088957 //an experimental blog
			}
		],
	}

var appPrefs = {
	urlFeedlandSocket: undefined,
	thePosts: new Array (),
	theLog: new Array ()
	}

var myFeedland = undefined;
var myWordpress = undefined;

const whenStart = new Date ();
var flPrefsChanged = false;

function loadPrefs () { //9/22/25 by DW
	if (localStorage.socketdemo !== undefined) {
		try {
			const jstruct = JSON.parse (localStorage.socketdemo);
			for (var x in jstruct) {
				appPrefs [x] = jstruct [x];
				}
			console.log ("loadPrefs: localStorage.socketdemo.length == " + gigabyteString (localStorage.socketdemo.length));
			}
		catch (err) {
			}
		}
	}
function prefsChanged () {
	flPrefsChanged = true;
	}
function savePrefs () {
	localStorage.socketdemo = jsonStringify (appPrefs);
	}

function addToLog (theEvent, thePost) {
	const theFeedItem = thePost.theFeedItem;
	const theDraft = thePost.theDraft;
	
	appPrefs.theLog.push ({
		theEvent, 
		idItem: theFeedItem.id,
		url: theDraft.url,
		theText: theFeedItem.markdowntext,
		when: new Date ().toLocaleString ()
		});
	
	const shortText = maxStringLength (theFeedItem.markdowntext, 50);
	const url = theDraft.url;
	console.log ("addToLog, " + theEvent + ", theFeedItem.id = " + theFeedItem.id + ", theDraft.url == " + theDraft.url + ", theFeedItem.markdowntext == " + shortText + "\n");
	}

function findSite (feedUrl) {
	var theSite = undefined;
	appConsts.theSites.forEach (function (item) {
		if (item.feedUrl == feedUrl) {
			theSite = item;
			}
		});
	return (theSite);
	}
function findPost (id) {
	var thePost = undefined;
	appPrefs.thePosts.forEach (function (item) {
		if (item.id== id) {
			thePost = item;
			}
		});
	return (thePost);
	}
function newPost (theSite, theFeedItem) {
	const thePost = {
		id: theFeedItem.id,
		theSite,
		theFeedItem,
		ctUpdates: 0,
		whenLastUpdate: new Date ().toLocaleString ()
		};
	appPrefs.thePosts.push (thePost);
	prefsChanged ();
	
	addToLog (new Date ().toLocaleTimeString () + " newPost", thePost);
	
	return (thePostRec);
	}
function newDraft () {
	const theUserInfo = myWordpress.getUserInfoSync ();
	const theDraft = {
		title: "",
		content: "",
		categories: [],
		idPost: undefined,
		idSite: undefined,
		flEnablePublish: false,
		whichEditor: "markdown",
		author: {
			id: theUserInfo.idUser,
			username: theUserInfo.username,
			name: theUserInfo.name
			},
		whenCreated: new Date ()
		}
	return (theDraft);
	}
function newWordlandPost (theSite, theFeedItem, callback) {
	const thePost = newPost (theSite, theFeedItem);
	const theDraft = newDraft ();
	theDraft.content = theFeedItem.markdowntext;
	const idSite = theSite.idSite;
	myWordpress.addPost (idSite, theDraft, function (err, theNewPost) { //5/7/25 by DW
		if (err) {
			console.log ("newWordlandPost: err.message == " + err.message);
			}
		else {
			theDraft.idSite = theNewPost.idSite;
			theDraft.idPost = theNewPost.idPost;
			theDraft.url = theNewPost.url;
			theDraft.whenCreated = theNewPost.whenCreated;
			theDraft.whenPublished = theNewPost.whenPublished; 
			theDraft.author = theNewPost.author;
			theDraft.flEnablePublish = false;
			thePost.theDraft = theDraft;
			prefsChanged ();
			}
		});
	}
function updateWordlandPost (thePost, theUpdatedItem) {
	const oldtext = thePost.theFeedItem.markdowntext;
	const newtext = theUpdatedItem.markdowntext;
	const flUpdate = newtext !== oldtext;
	if (flUpdate) {
		const theDraft = thePost.theDraft;
		theDraft.content = newtext;
		thePost.ctUpdates++;
		thePost.whenLastUpdate = new Date ().toLocaleString ();
		thePost.theFeedItem = theUpdatedItem;
		prefsChanged ();
		addToLog ("updatePost", thePost);
		myWordpress.updatePost (theDraft.idSite, theDraft.idPost, theDraft, function (err, theUpdatedPost) {
			if (err) {
				console.log ("newWordlandPost: err.message == " + err.message);
				}
			else {
				theDraft.whenPublished = theUpdatedPost.whenPublished; 
				theDraft.flEnablePublish = false;
				thePost.theDraft = theDraft;
				prefsChanged ();
				}
			});
		}
	}

function handleItem (flNew, theFeed, theItem) {
	const theSite = findSite (theFeed.feedUrl);
	if (theSite !== undefined) {
		const msg = (flNew) ? "new" : "updated";
		console.log (msg + " theItem.id == " + theItem.id);
		
		const thePost = findPost (theItem.id);
		if (thePost === undefined) { //it's new
			newWordlandPost (theSite, theItem);
			}
		else {
			updateWordlandPost (thePost, theItem);
			}
		}
	}
function feedlandSockets (userOptions) { //9/6/25 by DW
	const socketOptions = {
		flWebsocketEnabled: true,
		urlFeedlandSocket: undefined,
		handleMessage
		};
	mergeOptions (userOptions, socketOptions);
	
	var recentIds = new Object ();
	function notSeenRecently (id) {
		var flSeen = false;
		function ageOut () {
			var newObject = new Object ();
			for (var x in recentIds) {
				if (secondsSince (recentIds [x]) <= readerlandConsts.maxSecsBetwNotifications) {
					newObject [x] = recentIds [x];
					}
				}
			recentIds = newObject;
			}
		ageOut (); //remove expired ids
		for (var x in recentIds) {
			if (id == x) {
				flSeen = true;
				}
			}
		recentIds [id] = new Date ();
		return (!flSeen);
		}
	
	
	function handleMessage (theCommand, thePayload) {
		function getTitle (item) {
			if (item.title === undefined) {
				return (maxStringLength (stripMarkup (item.description), 35));
				}
			else {
				return (item.title);
				}
			}
		switch (theCommand) {
			case "newItem": 
				handleItem (true, thePayload.theFeed, thePayload.item);
				break;
			case "updatedItem": 
				handleItem (false, thePayload.theFeed, thePayload.item);
				break;
			}
		}
	
	wsConnectUserToServer (socketOptions); //5/28/25 by DW
	}


function updateForLogin (flConnected) {
	var idActive, idOther;
	if (flConnected === undefined) {
		flConnected = myWordpress.userIsSignedIn ()
		}
	if (flConnected) {
		idActive = "#idSignedOn";
		idOther = "#idSignedOff";
		}
	else {
		idActive = "#idSignedOff";
		idOther = "#idSignedOn";
		}
	if ($(idActive).css ("display") != "block") {
		$(idActive).css ("display", "block")
		}
	if ($(idOther).css ("display") != "none") {
		$(idOther).css ("display", "none")
		}
	
	if (flConnected) { //11/12/25 by DW
		$("#idMainMenu").css ("display", "block")
		}
	else {
		$("#idMainMenu").css ("display", "none")
		}
	}

function startup () {
	loadPrefs ();
	console.log ("startup");
	
	
	function everySecond () {
		if (flPrefsChanged) {
			savePrefs ();
			flPrefsChanged = false;
			}
		}
	const options = {
		urlFeedlandSocket: appConsts.urlFeedlandSocket,
		}
	myFeedland = new feedlandSockets (options); 
	
	const wpOptions = {
		serverAddress: "https://wordland.dev/",
		urlChatLogSocket: "wss://wordland.dev/",
		flMarkdownProcess: false //if true it would convert content to html when we publish -- 10/10/24 by DW
		}
	myWordpress = new wordpress (wpOptions);
	myWordpress.startup (function (err) {
		if (err) {
			alertDialog ("Can't run the app because there was an error starting up.");
			}
		else {
			if (myWordpress.userIsSignedIn ()) {
				}
			else {
				updateForLogin (); 
				}
			}
		});
	
	self.setInterval (everySecond, 1000); 
	hitCounter (); //9/7/25 by DW
	}
