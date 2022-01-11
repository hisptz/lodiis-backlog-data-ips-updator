#!/bin/bash
clear
if [ "$#" -eq "0" ]; then
   node --max_old_space_size=10000 index.js
else
   node --max_old_space_size=8000 index.js $1
fi
