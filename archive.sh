#!/bin/bash

baseDir=$1 
tmpfile=$2 
shift
shift
pathlist=$@

cd $baseDir
echo zip -r -o $tmpfile $pathlist > /tmp/log.log 2>&1
zip -r -o $tmpfile $pathlist


