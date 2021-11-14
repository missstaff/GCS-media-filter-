# GCS-media-filter-
A Google Cloud Storage (GCS) Function that scans both video and image media for explicit content.  

GCS Media Filter Function Documentation

Media Filter is a Google Cloud Storage (GCS) function written in Node.js 14. This documentation will be focused on working with GCS in the web browser interface.

There are a few steps to complete before writing this GCS Function.

SETUP:

1) Go to https://console.cloud.google.com/ and create a Google developers account, if you do not have one.

2) Create a project. If you are unsure how to create a project, in the navigation bar there is a drop-down menu where you can select and create projects. Select create a project and follow the prompts.

3) You may need to enable billing for this project to use the APIs and services that this function utilizes. There could be costs associated with running this project. 

4) You will need to enable several APIs.Enable the Cloud Functions, Cloud Build, Cloud Storage, Eventarc, Cloud Vision, and Video Intelligence APIs. They can be found by searching for them in the search bar at the top of the page in the navigation menu in the Google Cloud Console web browser interface.

5) Once the APIs are enabled. Go to the APIs and Services Page in Google Cloud Console by selecting the hamburger menu that looks like 3 stacked horizontal lines in the upper-left portion of the page.

6) Select Credentials from the menu on the left to go to the Credentials page.

7) Select "+CREATE CREDENTIALS" from the top of the page. Then create API Key.

8) On the APIs and Services page select "+CREATE CREDENTIALS" then select Service Account. Follow the prompts to create a Service account. In the account access section set it to basic and then owner.

9) If you will be using PowerShell or testing in VSCode you will need keys. Once the service account is created select its email.

10) Select keys.

11) Select add key, then click Create new key.

12) Select Create. A JSON key file is downloaded to your computer. Keep this key is a safe place.
Because we are going to filter out inappropriate content we will use two buckets. One bucket for uploads and one bucket for flagged content.

CREATE BUCKETS:

In GCS: 
	1) Type Cloud Storage in the search bar and select Cloud Storage, then select create bucket. This will be our uploads bucket.
	2) Follow the prompts. In the control access to object section do not enforce public access prevention. And set access control to fine-grained. Finish the following prompts and then select create.
	3) Create our flagged content bucket, the same as step 2 except this time do enforce public access prevention. 

In Powershell: 
	1) Download the SDK by running:
		(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe","$env:Temp				\GoogleCloudSDKInstaller.exe")&$env:Temp\GoogleCloudSDKInstaller.exe

	*can use the terminal in VSCode from here if preferred*

	2) Log in to GCS:
		run: gcloud auth login and then select your google account to log in; follow the prompts to ensure the correct project is selected.
	3) Set credentials:
		run: set GOOGLE_APPLICATION_CREDENTIALS=./path-to/keys.json 
	4) Create the uploads bucket:
		run: gsutil mb gs://<bucketNameHere>
	5) Make the uploads bucket publicly readable:
		run: gsutil defacl set public-read gs://<bucketNameHere>  
	6) Create a flagged content bucket by repeating step 4 but giving this bucket a different name. Do not repeat step 5.
	7) To prevent CORS violations or if you encounter a CORS violation:
		You will need to create a .json file defining the cors. I recommend naming it cors.json and running this command for both buckets.
		[
			{
					"origin": "https://localhost:<your port num>",
					"responseHeader": [
  					"application/json",
  					"text/plain;charset=UTF-8",
  					"application/x-www-form-urlencoded;charset=UTF-8",
  					"multipart/form-data"
					],
					"method": ["GET", "POST"],
					"maxAgeSeconds": 3600
			 }
		]

		then run: gsutil cors set <path-to-keys.json> gs://<bucketNameHere>
Set up Firestore:
	1) Search Firestore in the search bar.
	2) Select Firestore.
	3) Select native mode.
	4) Create a collection, a document is automatically added you can leave it or delete it, fyi if you delete it your DB may also be removed until there is other data in it.
Now that our environment is set up let's create a GCS function. While functions can be written tested and uploaded in VSCode, the rest of this documentation will discuss writing a Google Cloud Function and writing data to the Firebase DB using the Google Cloud interface.

Media Filter  is a function written with the intention of scanning media uploads such as images and videos and flagging them for inappropriate content. If the upload is deemed inappropriate it is removed from the uploads bucket and sent to a flagged media bucket. If the uploaded media deemed safe is then sent to the Firebase DB and allowed to proceed to upload to the platform. The threshold for inappropriate is a LIKELY or higher rating.

Create a Google Cloud Function:
	1) Type Cloud Functions in the search bar and select Cloud Functions.
	2) Select Google Cloud Functions
	3) Select +CREATE FUNCTION
	4) Name your function, set the Event Type to finalize/create, select the uploads bucket and select save, then next this will create a generic function.
	5) Remove all contents from both the index.js file and the package.json file in the GCS Function you just created.
	6) Copy and paste the index.js file from this gist into the index.js file of the GSC CloudFunction you just created. Then copy the package.json file from this gist and paste it into the package.json file of your GCS Function.
	8) Be sure that runtime engine is set to node.js 14
	9) Change entry point to analyzeGCS.
	10) Deploy function.

Test the function:
	1) Go to Google Cloud Storage and select the uploads bucket.
	2) Upload images and video to test Google Vision and Google Video AI functionality.
	3) Safe media remains in the uploads bucket and it along with its metadata are stored in the Firestore DB.
	4) Unsafe media is removed from the uploads bucket and sent to a flagged media bucket that does not upload data to Firestore and no media has a public URL.
