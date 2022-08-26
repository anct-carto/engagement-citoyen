/*
    Carte interactive des territoires en commnun et territoires d'engagement
    Hassen Chougar / service cartographie - ANCT
    dependances : Leaflet 1.0.8, vue 2.7, vue-router 4.0.5, bootstrap 5.1, papaparse 5.3.1
*/

// Chargement données globales ****************************************************************************


// parse csv (ou tableau issu d'un tableau partagé) en json
function fetchCsv(data_url) {
    return new Promise((resolve,reject) => {
        Papa.parse(data_url, {
            download: true,
            header: true,
            complete: (res) => resolve(res.data),
            error:(err) => reject(err)
        });
    })
}

// charge depuis session storage ou fetch
async function getData(path) {
    const sessionData = JSON.parse(sessionStorage.getItem("session_data1"));
    if(sessionData) {
        return sessionData
    } else {
        try {
            const data = await fetchCsv(path)
            // const req = await fetch("https://grist.incubateur.anct.gouv.fr/api/docs/f9htkc9G8u4D/tables/Engagement_citoyen/records", {
            //     method: "POST",
            //     headers: {
            //         "Content-Type": "application/json",
            //         Authorization: "Bearer bd1c67305f464f797c8d09bfa76a9c6c21c2c18a",
            //     },
            //   })
            // const data = await req.json()
            sessionStorage.setItem('session_data1',JSON.stringify(data));
            return data
        } catch (error) {
            console.error(error)
        }
    }
}


const dataUrl = "data/liste_tec_te.csv"
let tab = JSON.parse(sessionStorage.getItem("session_data"));
let page_status;



// ****************************************************************************

// écran de chargement
const Loading = {
    template: `
    <div id = "loading" class="w-100 h-100 d-flex flex-column justify-content-center align-items-center">
        <div class="row">
        <div class="spinner-border" role="status">
            <p class="sr-only">Loading...</p>
        </div>
        </div>
        <div class="row">
        <p>Chargement en cours ...</p>
        </div>
    </div>
    `
}

// ****************************************************************************


// composant "barre de recherche"
const SearchBar = {
    template: `
            <div id="search-bar-container">
                <div class="input-group">
                    <input ref = "input" class="form-control shadow-none py-2 border-right-0 border-left-0"
                            id="search-field" type="search"
                            placeholder="Rechercher un territoire ..." 
                            v-model="inputAdress"
                            @keyup="onKeypress($event)" 
                            @keydown.down="onKeyDown"
                            @keydown.up="onKeyUp"
                            @keyup.enter="onEnter">
                    </div>
                    <div class="autocomplete-suggestions-conainter" v-if="isOpen">
                        <ul class = "list-group">
                            <li class="list-group-item" v-for="(suggestion, i) in suggestionsList"
                                @click="onClickSuggest(suggestion)"
                                @mouseover="onMouseover(i)"
                                @mouseout="onMouseout(i)"
                                :class="{ 'is-active': i === index }">
                                    {{ suggestion.libelle }} ({{ suggestion.codgeo }})
                            </li>
                        </ul>
                    </div>
            </div>`,
    data() {
        return {
            index:0,
            inputAdress:'',
            isOpen:false,
            suggestionsList:[],
        }
    },
    watch: {
        inputAdress() {
            if (!this.inputAdress) {
                this.isOpen = !this.isOpen;
                this.index = 0;
                this.suggestionsList = [];
            }
        }
    },
    async mounted() {
        document.addEventListener("click", this.handleClickOutside);
        this.data = await getData(dataUrl)
    },
    destroyed() {
        document.removeEventListener("click", this.handleClickOutside);
    },
    methods: {
        onKeypress() {
            this.isOpen = true;
            let val = this.inputAdress;

            if(val === '') {
                this.isOpen = false;                
            };

            this.suggestionsList = '';

            if (val != undefined && val != '') {
                result = this.data.filter(e => {
                    return e.libelle.toLowerCase().includes(val.toLowerCase())
                });
                this.suggestionsList = result.slice(0,6);
            }
        },
        onKeyUp() {
            if (this.index > 0) {
                this.index = this.index - 1;
            };
        },
        onKeyDown() {
            if (this.index < this.suggestionsList.length) {
                this.index = this.index + 1;
            }
        },
        onMouseover(e) {
            this.index = e;
        },
        onMouseout() {
            this.index = -1;
        },
        onEnter() {
            if(this.suggestionsList[this.index]) {
                this.inputAdress = this.suggestionsList[this.index].libgeo;
                
                suggestion = this.suggestionsList[this.index];
                this.$emit('searchResult',suggestion)

                this.suggestionsList = [];
                this.isOpen = !this.isOpen;
                this.index = -1;                
            }
        },
        onClickSuggest(suggestion) {            
            event.stopPropagation()
            // reset search
            this.inputAdress = suggestion.libgeo;
            
            this.suggestionsList = [];
            this.isOpen = !this.isOpen;

            this.$emit('searchResult',suggestion);
        },
        handleClickOutside(evt) {
            if (!this.$el.contains(evt.target)) {
              this.isOpen = false;
              this.index = -1;
            }
        }
    },
};

// ****************************************************************************

// composant texte d'introduction
const IntroTemplate = {
    template: `
    <div>
        <h4>Exemple de titre</h4>
        <p>Présentation carte</p>
        <h4>Exemple de titre 2</h4>
        <p>Présentation démarche</p>
    </div>`
};

// ****************************************************************************

// composant style texte fiche 
const CardInfoTemplate = {
    template:`
        <p v-if="element">
            <span class="subtitle">{{ subtitle }}</span><br>
            <span class="element">{{ element }}</span><br>
        </p>
    `,
    props: ['subtitle', 'element'],
};

// obs = observation
// composant fiche 
const CardTemplate = {
    template:`
        <div class="card">
            <div class= "card-header" :style="'color:'+obs.color">
                <span>{{ obs.libgeo }} ({{ obs.codgeo }})</span>
            </div>
            <div class= "card-body">
                <info subtitle="Nombre d'habitants en 2019" :element="obs.pop"></info>
                <info subtitle="Type de démarche engagée" :element="obs.demarche"></info>
                <info subtitle="Période d'accompagement" :element="'A venir'"></info>
                <info subtitle="URL" :element="'A venir'"></info>
                <info subtitle="Projets partagés" :element="'A venir'" v-if="obs.demarche=='TEC'"></info>
                <info subtitle="Actions accompagnées" :element="'A venir'"></info>
                <info subtitle="EPCI" :element="obs.lib_epci"></info>
            </div>
        </div>`,
    props: ['obs'],
    components: {
        'info':CardInfoTemplate,
    }
};

// ****************************************************************************

// composant sidebar
const SidebarTemplate = {
    template: ` 
    <div id="sidebar" class="leaflet-sidebar collapsed">
        <!-- nav tabs -->
        <div class="leaflet-sidebar-tabs">
            <!-- top aligned tabs -->
            <ul role="tablist">
                <li><a href="#home" role="tab"><i class="las la-home"></i></a></li>
                <li><a href="#a-propos" role="tab"><i class="las la-info-circle"></i></a></li>
            </ul>
            </ul>
        </div>
        <!-- panel content -->
        <div class="leaflet-sidebar-content">
            <div class="leaflet-sidebar-header">
                <span>
                    Carte interactive des
                </span>
                <h4>
                    territoires en commun et territoires d'engagement
                </h4>
                <span class="leaflet-sidebar-close" @click="sidebar.close()">
                    <i class="la la-step-backward"></i>
                </span>
            </div>
            <div class="leaflet-sidebar-pane" id="home">
                <div v-if="!show" class="sidebar-body">
                    <search-group @searchResult="getResult"></search-group><br>
                    <text-intro></text-intro>
                </div>
                <div>
                    <card :obs="cardContent" v-if="show"></card><br>
                    <button id="back-btn" type="button" class="btn btn-primary" v-if="show" @click="onClick">
                        <i class="la la-arrow-left"></i>
                        Retour
                    </button>
                </div>
            </div>
            <div class="leaflet-sidebar-pane" id="a-propos">
                <a href="https://agence-cohesion-territoires.gouv.fr/" target="_blank">
                    <img src="img/logo_anct.png" width="100%" style = 'padding-bottom: 5%;'>
                </a>
                <p>
                    <b>Source et administration des données :</b>
                    ANCT
                </p>
                <p>
                    <b>Réalisation  et maintenance de l'outil :</b>
                    ANCT, pôle Analyse & diagnostics territoriaux - <a href = 'https://cartotheque.anct.gouv.fr/cartes' target="_blank">Service cartographie</a>
                </p>
                <p>Technologies utilisées : Leaflet, Bootstrap, Vue.js 2.7</p>
                <p>Le code source de cet outil est consultable sur <a href="https://www.github.com/anct-carto/pvd" target="_blank">Github</a>.</p>
            </div>
        </div>
    </div>`,
    components: {
        'search-group':SearchBar,
        card: CardTemplate,
        'text-intro':IntroTemplate
    },
    props: ['sourceData'],
    data() {
        return {
            show:false,
            cardContent:null
        }
    },
    computed: {
        // filteredList() {
        //     return this.sourceData.slice(0, this.nbResults)
        // },
    },
    watch: {
        sourceData() {
            this.cardContent = this.sourceData;
            this.cardContent ? this.show = true : this.show = false
        },
    },
    methods: {
        onClick() {
            this.cardContent = '';
            this.show = !this.show;

            this.$emit("clearMap", true) // tell parent to remove clicked marker layer
            
            event.stopPropagation()
        },
        getResult(result) {
            this.$emit('searchResult', result)
        }
    },
};



// ****************************************************************************

// composant carte avec interactions associées

const MapTemplate = {
    template: `
        <div>
            <sidebar 
                ref="sidebar" 
                :sourceData="cardContent" 
                @clearMap="clearMap()" 
                @searchResult="onSearchResultReception">
            </sidebar>
            <div id="mapid"></div>
    </div>`,
    data() {
        return {
            config:{
                map:{
                    zoom: 6,
                    center: [46.413220, 1.219482],
                    zoomSnap: 0.05,
                    maxZoom:18,
                    preferCanvas: true,
                    zoomControl:false,
                },
                sidebar:{
                    autopan: true,
                    closeButton: true,
                    container: "sidebar",
                    position: "left",
                }
            },
            symbology: {
                styles:{
                    labels:['TDE','TEC','CCO'],
                    colors:['#039d7b','#f69000','#293173'],
                },    
                basemap:{
                    dep:{
                        interactive:false,
                        style: {
                            fillColor:"#e8ded2",
                            fillOpacity:1,
                            color:"white",
                            weight:0.5,
                            opacity:1,
                        },
                    },
                    reg:{
                        interactive:false,
                        style: {
                            fillOpacity:0,
                            weight:1.25,
                            color:'white'
                        },
                    },
                    drom:{
                        interactive:false,
                        style: {
                            fillOpacity:0,
                            weight:0.5,
                            color:'#293173'
                        },
                    }
                },
                markers:{
                    default:{
                        radius:6,
                        fillOpacity:.9,
                        color:"white",
                        weight:1,
                    },
                    clicked:{
                        radius:10,
                        fillOpacity:1,
                        color:"white",
                        opacity:0.75,
                        weight:7,
                    },
                },
                tooltip:{
                    default:{
                        direction:"top",
                        sticky:true,
                        className:'leaflet-tooltip',
                        opacity:1,
                        offset:[0,-15],
                        // permanent:true
                    },
                    clicked:{
                        direction:"top",
                        className:'leaflet-tooltip-clicked',
                    },
                }
            },
            cardContent:null,
        }
    },
    components: {
        'sidebar':SidebarTemplate,
    },
    computed: {
        map() {
            let map = L.map('mapid', this.config.map);
            map.attributionControl.setPrefix('<a href="https://leafletjs.com" title="A JavaScript library for interactive maps">Leaflet</a>')
            map.attributionControl.addAttribution("<a href = 'https://cartotheque.anct.gouv.fr/' target = '_blank'>ANCT</a>");
            
            // zoom control, fullscreen & scale bar
            L.control.zoom({position: 'topright'}).addTo(map);
            L.control.fullscreen({
                position:'topright',
                forcePseudoFullScreen:true,
                title:'Afficher la carte en plein écran'
            }).addTo(map);
            L.control.scale({ position: 'bottomright', imperial:false }).addTo(map);

            // au clic, efface la recherche
            map.on("click",() => {
                event.stopPropagation();
                this.clearMap()
            })

            return map;            
        },
        sidebar() {
            const sidebar = window.L.control.sidebar(this.config.sidebar).addTo(this.map);
            // prevent drag over the sidebar and the legend
            preventDrag(sidebar, this.map);
            return sidebar
        },
        // calques : habillage, marqueurs, étiquettes, marqueur sélectionné
        baseMapLayer() {
            return L.layerGroup({className: 'basemap-layer',interactive:false}).addTo(this.map)
        },
        pinLayer() {
            return L.layerGroup({ className: 'pin-layer' }).addTo(this.map);
        },
        // markersLayer() {
        //     return L.layerGroup({ className: 'points'}).addTo(this.map)
        // },
        tecLayer() {
            return L.layerGroup({ className: 'points'}).addTo(this.map)
        },
        tdeLayer() {
            return L.layerGroup({ className: 'points'}).addTo(this.map)
        },
        ccoLayer() {
            return L.layerGroup({ className: 'points'}).addTo(this.map)
        },
        labelLayer() {
            return L.layerGroup({ className: 'label-layer' }).addTo(this.map);
        },
        comGeom() {
            return this.loadGeom("data/geom_ctr.geojson")
        },
        async rawData() {
            return getData(dataUrl)
        },
    },
    async mounted() {
        // crée le fond de carte
        this.createBasemap(); // fond
        this.displayToponym(); // toponymes

        // 1. joint les données attributaires aux géométries ...
        this.joinedData = this.joinGeom(await this.rawData, await this.comGeom)
        // ... 2. créée la couche sur leaflet ...
        this.createMarkers(this.joinedData)

        // création fenêtre de contrôle des couches
        L.control.layers(null,{
            "Territoires en commun :<br>les projets partagés":this.tecLayer,
            "Territoires d'engagement :<br>les parcours":this.tdeLayer,
            "Territoires d'engagement :<br>la cellule de conseil et d'orientation":this.ccoLayer,
            "Toponymes":this.labelLayer
        },{
            collapsed:false,
            position:"bottomright"
        }).addTo(this.map)

        this.checkPageStatus(); // enlève le loading spinner et charge les données si tout est ok
    },
    methods: {
        async loadGeom(file) {
            const res = await fetch(file);
            const data = await res.json()
            return data
        },
        checkPageStatus() {
            if(page_status == undefined) {
                window.setTimeout(this.checkPageStatus,5);
            } else {
                // ajout données
                // this.createMarkers()
            };
        },
        joinGeom(attrData,res) {
            // 1/ récupération des géométries dont le code geo est présent dans le csv
            let features = res.features.filter(feature => {
                if(attrData.filter(e => e.codgeo == feature.properties.codgeo).length >0) {
                    return feature
                }
            });
            // 2 jointure
            features.forEach(e => {
                attrData.forEach(d => {
                    if(e.properties.codgeo == d.codgeo) {
                        for (var key of Object.keys(d)) {
                            e.properties[key] = d[key]
                        }
                    }
                })
            })
            return features
        },
        createBasemap() {
            // fonction pour créer le fond de carte
            let promises = [];
            promises.push(this.loadGeom("data/geom_dep.geojson"));
            promises.push(this.loadGeom("data/geom_reg.geojson"));
            promises.push(this.loadGeom("data/cercles_drom.geojson"));
            promises.push(this.loadGeom("data/labels.geojson"));

            Promise.all(promises).then(res => {
                let map = this.map;

                if(map) {
                    geom_dep = new L.GeoJSON(res[0], this.symbology.basemap.dep).addTo(this.baseMapLayer);
                    geom_reg = new L.GeoJSON(res[1], this.symbology.basemap.reg).addTo(this.baseMapLayer);
                    cercles_drom = new L.GeoJSON(res[2],this.symbology.basemap.drom).addTo(this.baseMapLayer);
                };
            }).catch((err) => {
                console.log(err);
            });
        },
        displayToponym() {
            this.loadGeom("data/labels.geojson").then(labelGeom => {
                // déclaration des objets "map" et "layer" comme constantes obligatoire sinon inconnu dans le zoomend avec "this"
                const labelLayer = this.labelLayer;
                const map = this.map;
                
                const labelReg = LToponym(labelGeom,"région");
                const labelDep = LToponym(labelGeom,"département");
                labelReg.addTo(labelLayer);

                // ajout/suppression étiquettes reg ou dep en fonction du zoom
                map.on('zoomend', function() {
                    let zoom = map.getZoom();
                    switch (true) {
                      case zoom < 7 :
                        labelDep.removeFrom(labelLayer)
                        break;
                      case zoom >= 6 :
                        labelDep.addTo(labelLayer);
                        break;
                    }
                });

                function LToponym(sourceData,statut) {
                    return new L.GeoJSON(sourceData, {
                        pointToLayer: (feature,latlng) => L.marker(latlng, {
                            icon:createLabelIcon("labelClassReg", feature.properties.libgeom),
                            interactive: false,
                            className:"regLabels"
                        }),
                        filter:(feature, layer) => feature.properties.STATUT == statut,
                        className:"regLabels",
                        rendererFactory: L.canvas()
                      })
                }
            })
        },
        createMarkers(data) {
            for(let i=0; i<data.length; i++) {
                let territoire = data[i];
                let props = territoire.properties;
                let symbologyDefault = this.symbology.markers.default
                
                let marker = new L.GeoJSON(territoire, {
                    pointToLayer: function (feature, latlng) {
                        return L.circleMarker(latlng, symbologyDefault);
                    }
                }).bindTooltip(this.stylishTooltip(props),this.symbology.tooltip.default)
                .on("mouseover", (e) => {
                    e.target.setStyle(this.symbology.markers.clicked)
                }).on("mouseout",(e) => {
                    e.target.setStyle(symbologyDefault)
                    // e.target.setStyle({fillColor:this.getColor(e.demarche)})
                }).on("click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    this.onClick(territoire)
                });
                marker.content = props;
                marker.content.color = this.getColor(props.demarche)
                marker.setStyle({fillColor:marker.content.color});
                
                // ajout au calque correspondant
                switch (props.demarche) {
                    case "TEC":
                        marker.addTo(this.tecLayer);                        
                        break;
                    case "TDE":
                        marker.addTo(this.tdeLayer);
                        break;
                    case "CCO":
                        marker.addTo(this.ccoLayer);                        
                        break;
                }
            };
            setTimeout(() => {
                this.sidebar.open('home');
            }, 100);
        },
        onClick(i) {
            // vide la couche si pleine
            this.pinLayer.clearLayers();
            
            // crée un marqueur au clic
            let coords = i.geometry.coordinates;
            let glow = new L.circleMarker([coords[1],coords[0]],this.symbology.markers.clicked).addTo(this.pinLayer);
            let circle = new L.circleMarker([coords[1],coords[0]],this.symbology.markers.default).addTo(this.pinLayer);

            // stylisation en fonction de la propriété de différenciation
            circle.setStyle({fillColor:this.getColor(i.properties.demarche)});
            glow.setStyle({fillColor:this.getColor(i.properties.demarche)});

            // envoie les infos de l'élément sélectionné au composant "fiche"
            this.cardContent = i.properties;
            this.sidebar.open("home");
        },
        stylishTooltip(marker) {
            return `<span style="background-color:${this.getColor(marker.demarche)}">${marker.libgeo}</span>`
        },
        onSearchResultReception(result) {
            // retrouve l'entité correspondante dans le tableau original
            result = this.joinedData.filter(e => e.properties.codgeo == result.codgeo)[0]
            // simule un click sur cette entité pour renvoyer la fiche correspondante
            this.onClick(result);

            // sur la carte, fait un zoom (facultatif)
            // let coords = result.geometry.coordinates;
            // this.map.flyTo([coords[1],coords[0]], 10, {duration: 1});
        },
        clearMap() {
            this.cardContent = null;
            this.pinLayer.clearLayers();
        },
        flyToBoundsWithOffset(layer) {
            // cette fonction est utile pour faire décaler le centre de la carte sur le côté droit si le panneau est ouvert
            let offset = document.querySelector('.leaflet-sidebar-content').getBoundingClientRect().width;
            this.map.flyToBounds(layer, { paddingTopLeft: [offset, 0] });
        },
        getColor(type) {
            // cette fonction est utile pour récupérer la bonne couleur de chaque modalité préalablement déterminée
            let color;
            this.symbology.styles.labels.forEach((label,i) => {
                if(label === type) color = this.symbology.styles.colors[i]
            })
            return color
        },
    },
}



// ****************************************************************************
// ****************************************************************************

const AppTemplate = {
    template: 
        `<div>
            <loading v-if="loaded=='loaded'"></loading>
            <leaflet-map ref = "map"></leaflet-map>
        </div>
    `,
    components: {
        'leaflet-map': MapTemplate,
        'loading':Loading,
    },
    data() {
        return {
            loaded:page_status
        }
    },
}

// instance vue
new Vue({
    el: '#app',
    components: {
        'app': AppTemplate,
    },
});


// ****************************************************************************
// ****************************************************************************


// Fonctions universelles (utiles dans tous les projets)

// empêcher déplacement de la carte en maintenant/glissant le pointeur de souris sur sidebar
function preventDrag(div, map) {
    // Disable dragging when user's cursor enters the element
    div.getContainer().addEventListener('mouseover', function () {
        map.dragging.disable();
    });

    // Re-enable dragging when user's cursor leaves the element
    div.getContainer().addEventListener('mouseout', function () {
        map.dragging.enable();
    });
};

// création d'étiquette de repères (chef lieux par ex) 
function createLabelIcon(labelClass,labelText) {
    return L.divIcon({
        className: svgText(labelClass),
        html: svgText(labelText)
    })
}
function svgText(txt) {
    return '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><text x="0" y = "10">'
        + txt + '</text></svg>';
}
