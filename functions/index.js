// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access the Firebase Realtime Database. 
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// Firestore handler
var db = admin.firestore();


const algoliasearch = require('algoliasearch');

// App ID and API Key are stored in functions config variables
const ALGOLIA_ID = functions.config().algolia.app_id;
const ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;

const client = algoliasearch(ALGOLIA_ID, ALGOLIA_ADMIN_KEY);


//TODO Manage dates and concurrency : must be indempotent and coherent





const USERS_INDEX_NAME = "USERS";

//USERS index manager
exports.syncUser = functions.firestore
.document(USERS_INDEX_NAME+'/{userID}')
.onWrite(event => {
    
    //userID
    const userID =  event.params.userID;
    
    // Get an object with the previous document value
    var previous = event.data.previous?event.data.previous.data():null;
    
    // Get an object with the current document value
    var user = event.data.data();
    
    //Document minimization 
    delete user.resume;
    delete user.lastRead;
    delete user.tariff;
    delete user.type;
    
    // Add an "objectID" field which Algolia requires
    user.objectID = userID;
    
    //Debug
    console.log("Will attempt to index: user/"+userID 
    ,"\n -->curr=",user ,"\n -->prev=",previous);
    
    // Write to the algolia index
    const index = client.initIndex(USERS_INDEX_NAME);
    //return index.saveObject(user);
    return null;
});






const _KEYWORDS_INDEX_NAME = "_KEYWORDS";

//USERS_KEYWODRS index manager
exports.syncUserKeyword = functions.firestore
.document(USERS_INDEX_NAME+'/{userID}/'+_KEYWORDS_INDEX_NAME+'/{keywordID}')
.onWrite(event => {
    
    //userID
    const userID =  event.params.userID;
    
    //keywordID
    const keywordID =  event.params.keywordID;
    
    // Get an object with the previous document value
    var previous = event.data.previous?event.data.previous.data():null;
    
    // Get an object with the current document value
    var keyword = event.data.data();
    
    if(!keyword.deleted && keyword.active){
        let keywordStr = keyword.keyword;
        
        //Debug
        console.log("Will attempt to index: user/"+userID+"/_keyword/"+keywordID 
        ,"\n -->curr=",keyword ,"\n -->prev=",previous);
        
        // Write to the algolia index
        const index = client.initIndex(_KEYWORDS_INDEX_NAME);
        //return index.saveObject(keywordStr);
        
    }else{
        //Debug
        console.log("Irrelevant to index: user/"+userID+"/_keyword/"+keywordID 
        ,"\n -->curr=",keyword ,"\n -->prev=",previous);
    }
    
    return null;
});





const _NEEDS_INDEX_NAME = "_NEEDS";

//USERS_NEEDS index manager
exports.syncUserNeed = functions.firestore
.document(USERS_INDEX_NAME+'/{userID}/'+_NEEDS_INDEX_NAME+'/{needID}')
.onWrite(event => {
    
    //userID
    const userID =  event.params.userID;
    
    //needID
    const needID =  event.params.needID;
    
    // Get an object with the previous document value
    var previous = event.data.previous?event.data.previous.data():null;
    
    // Get an object with the current document value
    var need = event.data.data();
    
    if(!need.deleted && need.active){
        
        //Debug
        console.log("Will attempt to index: user/"+userID+"/_need/"+needID 
        ,"\n -->curr=",need ,"\n -->prev=",previous);
        
        // Write to the algolia index
        const index = client.initIndex(_NEEDS_INDEX_NAME);
        //return index.saveObject(need);
        
    }else{
        //Debug
        console.log("Irrelevant to index: user/"+userID+"/_need/"+needID 
        ,"\n -->curr=",need ,"\n -->prev=",previous);
    }
    
    return null;
});






const _RATINGS_INDEX_NAME = "_RATINGS";

//User's ratings aggregation
exports.aggregateRatings = functions.firestore
.document(USERS_INDEX_NAME+'/{userID}/'+_RATINGS_INDEX_NAME+'/{ratingId}')
.onWrite(event => {
    
    //userID
    const userID =  event.params.userID;
    
    //keywordID
    const ratingId =  event.params.ratingId;
    
    // Get value of the newly added rating
    var ratingVal = event.data.get('rating');
    
    // Get a reference to the rated user
    var userRef = db.collection(USERS_INDEX_NAME).doc(userID);
    
    // Get a reference to the rated user ratings collection
    var userRatingsRef = userRef.collection(_RATINGS_INDEX_NAME) ;
    
    //debug
    console.log(1,'aggregateRatings','userID='+userID
    ,'ratingId='+ratingId,'ratingVal='+ratingVal);
    
    // Update aggregations in a transaction
    return db.runTransaction(transaction => {
        return transaction.get(userRatingsRef).then(snapshot => {
            let nbVoters = 0;
            let ratingsSum = 0;
            
            snapshot.forEach(doc => {
                ratingsSum += doc.get('rating');
                nbVoters++;      
                
                //debug
                console.log(2,'aggregateRatings','userID='+userID
                ,'ratingId='+ratingId,'ratingVal='+ratingVal
                ,'ratingsSum='+ratingsSum,'nbVoters='+nbVoters
                ,doc.id, '=>', doc.data());
            });
            
            let avgRating = nbVoters == 0 ? 0 : ratingsSum / nbVoters;
            
            //debug
            console.log(3,'aggregateRatings','userID='+userID
            ,'ratingId='+ratingId,'ratingVal='+ratingVal
            ,"avgRating="+avgRating,"nbVoters="+nbVoters);
            
            // Update user rating infos
            return transaction.update(userRef, {
                avgRating: avgRating,
                nbVoters: nbVoters
            });
            
        })
        .catch(err => {
            console.log('aggregateRatings','userRatingsRef : Error getting user{'+userID+'} ratings', err);
        });       
    });
});








// test func
exports.hello = functions.https.onRequest((request, response) => {
    const v = 5;
    console.log("my log v="+v);
    response.send("Hello *_* ! v="+v);
});
