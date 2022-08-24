/*
    Carte interactive des territoires en commnun et territoires d'engagement
    Hassen Chougar / service cartographie - ANCT
    dependances : Leaflet v1.0.8, vue v2.7, vue-router v4.0.5, bootstrap v4.6.0, papaparse v5.3.1
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
            sessionStorage.setItem('session_data1',JSON.stringify(data));
            return data
        } catch (error) {
            console.error(error)
        }    
    }
}


// const data_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOLYK3fGTi0MyoFY4iAz9zDsXFy7_t-dni9ijNBKnVZTW540K73BXDYCeUGJN80hXqCqscqX9xO19v/pub?output=csv"
const data_url = "data/liste_tec_te.csv"
let spreadsheet_res = [];
let tab = JSON.parse(sessionStorage.getItem("session_data"));
let page_status;



// ****************************************************************************

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
                            placeholder="Territoire ..." 
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
                                    {{ suggestion.libgeo }} ({{ suggestion.codgeo }})
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
        this.data = await getData(data_url)
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
                    return e.libgeo.toLowerCase().includes(val.toLowerCase())
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

// composants texte d'introduction
const IntroTemplate = {
    template: `
    <div>
        <h4>Exemple de titre</h4>
        <p>Présentation carte</p>
        <h4>Exemple de titre 2</h4>
        <p>Présentation démarche</p>
    </div>`
};


// composants fiche information
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
const CardTemplate = {
    template:`
        <div class="card">
            <div class= "card-header" :style="'color:'+obs.color">
                <span>{{ obs.lib_com }} ({{ obs.codgeo }})</span>
            </div>
            <div class= "card-body">
                <info subtitle="Nombre d'habitants en 2019" :element="obs.pop"></info>
                <info subtitle="Type de démarche engagée" :element="obs.demarche"></info>
                <info subtitle="Période d'accompagement" :element="'A venir'"></info>
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
                        <i class="las la-chevron-left"></i>
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
        depGeom() {
            return this.loadGeom("data/geom_dep.geojson")
        },
        comGeom() {
            return this.loadGeom("data/geom_com2020.geojson")
        },
        async rawData() {
            return await getData(data_url)
        }
    },
    async mounted() {
        // 1 charge les données puis ...
        this.rawData.then(data => {
            // ... 2 charge les géométries puis ...
            this.comGeom.then(geom => {
                // ... 3 joint les données aux géométries ...
                this.joinedData = this.joinGeom(data,geom)
                // ... 4 créée la couche sur leaflet ...
                this.createMarkers(this.joinedData)
            })
        })

        // fenêtre de contrôle des couches
        L.control.layers(null,{
            "Territoires en commun :<br>les projets partagés":this.tecLayer,
            "Territoires d'engagement :<br>les parcours":this.tdeLayer,
            "Territoires d'engagement :<br>la cellule de conseil et d'orientation":this.ccoLayer,
            // "Territoires":this.markersLayer,
            "Toponymes":this.labelLayer
        },{
            collapsed:false,
            position:"bottomright"
        }).addTo(this.map)

        this.createBasemap(); // load dep geojson
        this.checkPageStatus(); // remove loading spinner and load data
        // this.depGeom.then(e=>new L.GeoJSON(e)).then(this.map.addLayer.bind(this.map))
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
                this.createMarkers()
            };
        },
        joinGeom(attrData,res) {
            // 1/ récupération des géométries dont le code geo est présent dans le csv
            let features = res.features.filter(feature => {
                if(attrData.filter(e => e.codgeo == feature.properties.insee_com).length >0) {
                    return feature
                }
            });
            // 2 jointure
            features.forEach(e => {
                attrData.forEach(d => {
                    if(e.properties.insee_com == d.codgeo) {
                        for (var key of Object.keys(d)) {
                            e.properties[key] = d[key]
                        }
                    }
                })
            })
            return features
        },
        createBasemap() {
            let promises = [];
            promises.push(fetch("data/geom_dep.geojson"));
            promises.push(fetch("data/geom_reg.geojson"));
            promises.push(fetch("data/cercles_drom.geojson"));
            promises.push(fetch("data/labels.geojson"));

            Promise.all(promises).then(async([a, b, c, d]) => {
                const aa = await a.json();
                const bb = await b.json();
                const cc = await c.json();
                const dd = await d.json();
                return [aa, bb, cc, dd]
            }).then(res => {
                let map = this.map;
                let labelLayer = this.labelLayer
                this.geom_dep = res[0]
                this.geom_reg = res[1]

                if(map) {
                    geom_dep = new L.GeoJSON(res[0], this.symbology.basemap.dep).addTo(this.baseMapLayer);
                    geom_reg = new L.GeoJSON(res[1], this.symbology.basemap.reg).addTo(this.baseMapLayer);
                    cercles_drom = new L.GeoJSON(res[2],this.symbology.basemap.drom).addTo(this.baseMapLayer);

                    const labelGeom = res[3]

                    const labelReg = new L.GeoJSON(labelGeom, {
                        pointToLayer: function (feature, latlng) {
                          return L.marker(latlng,{
                            icon:createLabelIcon("labelClassReg", feature.properties.libgeom),
                            interactive: false,
                            className:"regLabels"
                          })
                        },
                        filter : function (feature, layer) {
                          return feature.properties.STATUT == "région";
                        },
                        className:"regLabels",
                        rendererFactory: L.canvas()
                      })
                    labelReg.addTo(labelLayer);
            
                    const labelDep = new L.GeoJSON(labelGeom, {
                        pointToLayer: function (feature, latlng) {
                          return L.marker(latlng,{
                            icon:createLabelIcon("labelClassDep", feature.properties.libgeom),
                            interactive: false
                          })
                        },
                        filter : function (feature, layer) {
                          return feature.properties.STATUT == "département";
                        },
                        className:"depLabels",
                        rendererFactory: L.canvas()
                      });


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
                    };
            }).catch((err) => {
                console.log(err);
            });
        },
        createMarkers(data) {
            for(let i=0; i<data.length; i++) {
                let e = data[i];
                let props = e.properties
                // let marker = L.circleMarker(e.geometry.coordinates,this.symbology.markers.default)
                let symbologyDefault = this.symbology.markers.default
                let marker = new L.GeoJSON(e, {
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
                    this.onClick(e.target.content)
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
                // marker.addTo(this.markersLayer);
            };
            setTimeout(() => {
                this.sidebar.open('home');
            }, 150);
        },
        onClick(i) {
            // vide la couche si pleine
            this.pinLayer.clearLayers();
            
            // crée un marqueur au clic
            let glow = new L.circleMarker([i.latitude, i.longitude],this.symbology.markers.clicked).addTo(this.pinLayer);
            let circle = new L.circleMarker([i.latitude, i.longitude],this.symbology.markers.default).addTo(this.pinLayer);
            circle.setStyle({fillColor:this.getColor(i.demarche)});
            glow.setStyle({fillColor:this.getColor(i.demarche)});

            // 2 envoie valeur au composant "fiche"
            this.cardContent = i;
            this.sidebar.open("home");
        },
        stylishTooltip(marker) {
            return `<span style="background-color:${this.getColor(marker.demarche)}">${marker.lib_com}</span>`
        },
        onSearchResultReception(result) {
            result = this.joinedData.filter(e => e.properties.codgeo == result.codgeo)[0]
            console.log(result);
            this.onClick(result.properties);

            this.map.flyTo(result.geometry.coordinates.reverse(), 10, {duration: 1});
        },
        clearMap() {
            this.cardContent = null;
            this.pinLayer.clearLayers();
        },
        flyToBoundsWithOffset(layer) {
            let offset = document.querySelector('.leaflet-sidebar-content').getBoundingClientRect().width;
            this.map.flyToBounds(layer, { paddingTopLeft: [offset, 0] });
        },
        getColor(type) {
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

// empêcher déplacement sur la carte
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
