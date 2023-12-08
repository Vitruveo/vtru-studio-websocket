#!/bin/sh

if [ "x$@" = "xwait" ] ; then
    while true ; do
        date
        node index.js
        sleep 300
    done
else
    echo Executando comando: $@
    $@
fi
sleep 60
