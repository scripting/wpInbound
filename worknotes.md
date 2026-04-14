#### 4/14/26; 1:40:11 PM by DW

Process markdown text. Something must've changed somewhere, but all of a sudden unprocessed markdown text is making it into daveverse.org. 

#### 3/9/26; 11:17:36 AM by DW

If this app wasn't running for a while the daveverse site doesn't have the items that were posted while it was gone. It depends on them being updated in order for them to register, and they won't show up on the correct date. 

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

