#### 11/16/25; 9:05:04 AM by DW

Process images at the beginning of markdown text as right-margin images from Scripting. 

Remove posts from appPrefs after 5 days.

Titles weren't being sent on new posts, they were only sent on updated posts. 

In addLog, only include markdown text in the console.log entry up to the first newline. 

#### 11/15/25; 9:10:59 AM by DW

We're using this initially to mirror posts on scripting.com on the daveverse site. But it is more general, it can handle any number of such pairs. 

We hook up to the FeedLand socket, and watch for new or updated posts.

For each site, we have the url of the feed, and the WordPress site id. 

If we haven't seen the post, we create a new one by calling into wpIdentity, otherwise we update the existing post. 

#### 11/12/25; 10:57:33 AM by DW

Started.

Hook in to feedlandSocket. 

When a new item or update comes in for the site we're watching for, we do the appropriate update. 

