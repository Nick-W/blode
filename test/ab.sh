while [ 1 ]
do
  ab -n $[($RANDOM % 800)] "http://localhost:8000/?severity=debug&message=makeitstop"
  sleep 1;
done
