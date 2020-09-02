# Transmetrics-Plus-PDF-Processor
 
# Starting server

First stop apache:
sudo /opt/bitnami/ctlscript.sh stop apache

Located in: /home/Transmetrics-Plus-PDF-Processor

Then run:
sudo node index &
Press the enter key, then type: “disown”, then close out of the SSH session

Will run on port 443

# To kill existing running server

Locate the process ids by running: ps -ef | grep "node"

Then: "sudo kill" the process that is "/opt/bitnami/nodejs/bin/.node.bin index"

# To update
Run:
sudo git pull origin master