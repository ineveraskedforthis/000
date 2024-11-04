package main

import (
	"log"
	"net/http"
)

func main() {
	http.Handle("/game000/css/", http.StripPrefix("/game000/css/", http.FileServer(http.Dir("css"))))
	http.Handle("/game000/js/", http.StripPrefix("/game000/js/", http.FileServer(http.Dir("js"))))

	http.Handle("/game000/", http.FileServer(http.Dir("./static")))
	log.Fatal(http.ListenAndServe(":8091", nil))
}
