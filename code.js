var myVersion = 0.61, myProductName = "wpInbound";

const appConsts = {
	urlFeedlandSocket: "wss://feedland.social/",
	ctDaysBeforeRemovingPost: 5,
	
	theSites: [
		{
			feedUrl: "http://scripting.com/rss.xml",
			idSite: 237777565 //daveverse
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
		url: (theDraft === undefined) ? undefined : theDraft.url,
		theText: theFeedItem.markdowntext,
		when: new Date ().toLocaleString ()
		});
	
	const shortText = maxStringLength (stringNthField (theFeedItem.markdowntext, "\n", 1), 50);
	const url = theDraft.url;
	
	const nowstring = new Date ().toLocaleTimeString ();
	console.log (nowstring + ", " + theEvent + ", theFeedItem.id = " + theFeedItem.id + ", theDraft.url == " + theDraft.url + ", theFeedItem.markdowntext == " + shortText + "\n");
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

function removeOldPosts () {
	const maxSecs = appConsts.ctDaysBeforeRemovingPost * 60 * 60 * 24;
	var newPostArray = new Array (), flChanged = false;
	appPrefs.thePosts.forEach (function (item) {
		const when = new Date (item.theDraft.whenCreated);
		if (secondsSince (when) < maxSecs) {
			newPostArray.push (item);
			}
		else {
			flChanged = true;
			}
		});
	if (flChanged) {
		appPrefs.thePosts = newPostArray;
		prefsChanged ();
		}
	}
function processMarkdown (mdtext) {
	const pattern = /^!\[\]\(([^)]*)\)/;
	const processedText = mdtext.replace (pattern, function (whole, url) {
		return ("<img src=\"" + url + "\" style=\"float: right; padding-left: 25px; padding-bottom: 10px; padding-top: 10px; padding-right: 15px;\">");
		});
	return (processedText);
	}

function newWordlandPost (theSite, theFeedItem, callback) {
	const theUserInfo = myWordpress.getUserInfoSync ();
	const thePost = {
		id: theFeedItem.id,
		theSite,
		theFeedItem,
		ctUpdates: 0,
		whenLastUpdate: new Date ().toLocaleString ()
		};
	appPrefs.thePosts.push (thePost);
	prefsChanged ();
	
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
	theDraft.content = processMarkdown (theFeedItem.markdowntext); //fixes up images so they float on the right of the text
	theDraft.title = theFeedItem.title; //11/16/25 by DW
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
			addToLog ("newPost", thePost);
			}
		});
	}
function updateWordlandPost (thePost, theUpdatedItem) {
	const oldtext = thePost.theFeedItem.markdowntext;
	const newtext = theUpdatedItem.markdowntext;
	
	const oldtitle = thePost.theFeedItem.title;
	const newtitle = theUpdatedItem.title;
	
	const flUpdate = (newtext !== oldtext) || (newtitle !== oldtitle);
	
	if (flUpdate) {
		const theDraft = thePost.theDraft;
		theDraft.content = processMarkdown (newtext);
		theDraft.title = newtitle; //11/15/25 by DW
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
	
	
	function everyMinute () {
		removeOldPosts ();
		}
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
		flWatchSocketForOtherCopies: false //I don't want to be interrupted if I'm using wordland on another machine
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
	runEveryMinute (everyMinute);
	hitCounter (); //9/7/25 by DW
	}
