paths=(. api web)
for i in "${paths[@]}"
do
	echo "$i"
  pushd $i
  npx npm-check-updates --target minor --upgrade
  npm i
  npx npm-check-updates
  popd
done
