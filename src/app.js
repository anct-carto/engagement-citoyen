/*
    Carte interactive des territoires en commnun et territoires d'engagement
    Hassen Chougar / service cartographie - ANCT
    dependances : Leaflet v1.0.7, vue v2.7, vue-router v4.0.5, bootstrap v4.6.0, papaparse v5.3.1
*/



const data_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTOLYK3fGTi0MyoFY4iAz9zDsXFy7_t-dni9ijNBKnVZTW540K73BXDYCeUGJN80hXqCqscqX9xO19v/pub?output=csv"
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

const searchBar = {
    template: `
            <div id="search-bar-container">
                <div class="input-group">
                    <input ref = "input" class="form-control shadow-none py-2 border-right-0 border-left-0"
                            id="search-field" type="search"
                            placeholder="Saisissez un nom de commune" 
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
                                    {{ suggestion.lib_com }} ({{ suggestion.insee_dep }})
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
    computed: {
        data() {
            return spreadsheet_res
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
    mounted() {
        document.addEventListener("click", this.handleClickOutside);
    },
    destroyed() {
        document.removeEventListener("click", this.handleClickOutside);
    },
    methods: {
        onKeypress(e) {
            this.isOpen = true;
            let val = this.inputAdress;

            if(val === '') {
                this.isOpen = false;                
            };

            this.suggestionsList = '';

            if (val != undefined && val != '') {
                result = this.data.filter(e => {
                    return e.lib_com.toLowerCase().includes(val.toLowerCase())
                });
                this.suggestionsList = result.slice(0,6);
            }
        },
        onKeyUp(e) {
            if (this.index > 0) {
                this.index = this.index - 1;
            };
        },
        onKeyDown(e) {
            if (this.index < this.suggestionsList.length) {
                this.index = this.index + 1;
            }
        },
        onMouseover(e) {
            this.index = e;
        },
        onMouseout(e) {
            this.index = -1;
        },
        onEnter() {
            this.inputAdress = this.suggestionsList[this.index].lib_com;
                        
            this.suggestionsList = [];
            this.isOpen = !this.isOpen;
            this.index = -1;
            
            suggestion = this.suggestionsList[this.index];
            this.$emit('searchResult',suggestion)
        },
        onClickSuggest(suggestion) {            
            // reset search
            this.inputAdress = suggestion.lib_com;
            
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


const introTemplate = {
    template: `
    <div>
        introduction
    </div>`
};


const cardInfoTemplate = {
    props: ['subtitle', 'element'],
    template:`
        <p v-if="element">
            <span class="subtitle">{{ subtitle }}</span><br>
            <span class="element">{{ element }}</span><br>
        </p>
    `,
};


const cardTemplate = {
    template:`
        <div class="card">
            <div class= "card-header">
                <span>{{ pvd.lib_com }} ({{ pvd.insee_dep }})</span>
            </div>
            <div class= "card-body">
                <info subtitle="Nombre d'habitants en 2017" :element="pvd.pop"></info>
                <info subtitle="Département" :element="pvd.lib_dep + ' (' + pvd.insee_dep + ')'"></info>
                <info subtitle="Région" :element="pvd.lib_reg"></info>
                <info subtitle="EPCI" :element="pvd.lib_epci"></info>
            </div>
        </div>`,
    props: ['pvd'],
    components: {
        'info':cardInfoTemplate,
    }
};


const Sidebar = {
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
            <div class="leaflet-sidebar-pane" id="home">
                <div class="leaflet-sidebar-header">
                    <span>Accueil</span>
                    <span class="leaflet-sidebar-close">
                        <i class="las la-step-backward"></i>
                    </span>
                </div>
                <div v-if="!show" class="sidebar-body">
                    <h3>
                        Carte interactive des territoires en commun et territoires d'engagement
                    </h3>
                    <search-group @searchResult="getResult"></search-group><br>
                    <text-intro></text-intro>
                </div>
                <div>
                    <card :pvd="cardContent" v-if="show"></card><br>
                    <button id="back-btn" type="button" class="btn btn-primary" v-if="show" @click="onClick">
                        <i class="la la-chevron-left"></i>
                        Retour à l'accueil
                    </button>
                </div>
            </div>
            <div class="leaflet-sidebar-pane" id="a-propos">
                <h2 class="leaflet-sidebar-header">
                    À propos
                    <span class="leaflet-sidebar-close">
                        <i class="las la-step-backward"></i>
                    </span>
                </h2>
                <a href="https://agence-cohesion-territoires.gouv.fr/" target="_blank">
                    <img src="img/logo_anct.png" width="100%" style = 'padding-bottom: 5%;'>
                </a>
                <p>
                    <b>Source et administration des données :</b>
                    ANCT, programme Petites villes de demain
                </p>
                <p>
                    <b>Réalisation  et maintenance de l'outil :</b>
                    ANCT, pôle Analyse & diagnostics territoriaux - <a href = 'https://cartotheque.anct.gouv.fr/cartes' target="_blank">Service cartographie</a>
                </p>
                <p>Technologies utilisées : Leaflet, Bootstrap, VueJS</p>
                <p>Le code source de cet outil est libre et consultable sur <a href="https://www.github.com/anct-carto/pvd" target="_blank">Github</a>.</p>
            </div>
        </div>
    </div>`,
    components: {
        'search-group':searchBar,
        card: cardTemplate,
        'text-intro':introTemplate
    },
    props: ['sourceData'],
    data() {
        return {
            show:false,
            cardContent:null,
        }
    },
    computed: {
        filteredList() {
            // return this.sourceData.slice(0, this.nbResults)
        }
    },
    watch: {
        sourceData() {
            this.cardContent = this.sourceData;
            if(this.sourceData) {
                this.show = true;
            }
        },
    },
    methods: {
        onClick() {
            this.cardContent = '';
            this.show = !this.show;
            this.$emit("clearMap", true) // tell parent to remove clicked marker layer
        },
        getResult(result) {
            this.$emit('searchResult', result)
        }
    },
};

let marker;
let circle;



// init vue-leaflet

const MapTemplate = {
    template: `
        <div>
            <leaflet-sidebar ref="sidebar" :sourceData="cardContent" @clearMap="clearMap()" @searchResult="onSearchResultReception"></leaflet-sidebar>
            <div id="mapid"></div>
        </div>`,
    data() {
        return {
            mapOptions: {
                zoom: 6,
                attribution: 'Fond cartographique &copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy;, contributeurs <a href="http://openstreetmap.org">OpenStreetMap</a>',
                center: [46.413220, 1.219482],
                zoomSnap: 0.5,
                maxZoom:18,
                preferCanvas: true,
                zoomControl:false
            },
            data:null,
            circleMarkerOptions: {
                radius:7,
                fillColor:"#e57d40",
                fillOpacity:.9,
                color:"white",
                weight:1.5
            },
            tooltipOptions: {
                direction:"top",
                sticky:true,
                className:'leaflet-tooltip'
            },
            clickedMarker:{
                latlng:null,
                tooltip:null,
                tooltipOptions:{
                    permanent:true, 
                    direction:"top", 
                    className:'leaflet-tooltip-clicked'
                },
                options: {
                    radius:10,
                    fillOpacity:1,
                    fillColor:"#e57d40",
                    color:"white",
                    opacity:0.85,
                    weight:7,
                }
            },
            geojson: {
                data:null,
                options:{
                    style: {
                        fillColor:"#e8ded2",
                        fillOpacity:1,
                        color:"white",
                        weight:0.5,
                        opacity:1
                    },
                    interactive:false
                }
            },
            styles: {
                colors: ['#293173','#f69000','#039d7b']
            },
            cardContent:null,
            dep_geom:null,
            reg_geom:null,
        }
    },
    components: {
        'leaflet-sidebar':Sidebar,
    },
    computed: {
        map() {
            let map = L.map('mapid', this.mapOptions);
            // attribution
            map.attributionControl.addAttribution("<a href = 'https://cartotheque.anct.gouv.fr/' target = '_blank'>ANCT</a>");
            
            // zoom control, fullscreen & scale bar
            L.control.zoom({position: 'topright'}).addTo(map);
            // L.control.fullscreen({
            //     position:'topright',
            //     forcePseudoFullScreen:true,
            //     title:'Afficher la carte en plein écran'
            // }).addTo(map);
            L.control.scale({ position: 'bottomright', imperial:false }).addTo(map);

            return map;            
        },
        sidebar() {
            // sidebar
            const sidebar = window.L.control.sidebar({
                autopan: true,
                closeButton: true, 
                container: "sidebar", 
                position: "left" 
            }).addTo(this.map);

            // prevent drag over the sidebar and the legend
            preventDrag(sidebar, this.map);

            return sidebar
        },
        // calques
        backgroundLayer() {
            return L.layerGroup({className: 'background-layer'}).addTo(this.map)
        },
        pointsLayer() {
            return L.layerGroup({ className: 'points'}).addTo(this.map)
        },
        pinLayer() {
            return L.layerGroup({ className: 'pin-layer' }).addTo(this.map);
        },
        maskLayer() {
            return L.layerGroup({ className: 'mask-layer' }).addTo(this.map);
        },
        labelLayer() {
            return L.layerGroup({ className: 'label-layer' }).addTo(this.map);
        }
    },
    mounted() {
        if(tab) {
            spreadsheet_res = tab;
            console.info("Loading from session storage");
            setTimeout(() => {                
                page_status = "loaded";
            }, 300);
        } else {
            this.init(); // load data
            console.info("Loading from drive");
        };
        this.loadDepGeom(); // load dep geojson
        this.checkPageStatus(); // remove loading spinner and load data

        this.map.on("click",(e) => {
            event.stopPropagation();
            // this.clearMap()
        })
    },
    methods: {
        onClick(i) {
            lib_com = i.lib_com;
            if(!marker) {
                marker = new L.marker([i.latitude, i.longitude]);
                circle = new L.circleMarker([i.latitude, i.longitude], this.clickedMarker.options).addTo(this.map)
                marker.bindTooltip(lib_com, this.clickedMarker.tooltipOptions);
            } else {
                marker.setLatLng([i.latitude, i.longitude])
                marker.setTooltipContent(lib_com)
                circle.setLatLng([i.latitude, i.longitude])
            };
            this.pinLayer.addLayer(marker);
            this.pinLayer.addLayer(circle);

            // send value to children
            this.cardContent = i;
            this.sidebar.open("home");
        },
        onSearchResultReception(e) {
            this.onClick(e);
            this.maskLayer.clearLayers();
            this.map.flyTo([e.latitude, e.longitude], 10, {duration: 1});
        },
        clearMap() {
            this.cardContent = '';
            this.pinLayer.clearLayers();
            this.maskLayer.clearLayers();
            this.map.flyTo(this.mapOptions.center, this.mapOptions.zoom, { duration: 1});
        },
        flyToBoundsWithOffset(layer) {
            let offset = document.querySelector('.leaflet-sidebar-content').getBoundingClientRect().width;
            this.map.flyToBounds(layer, { paddingTopLeft: [offset, 0] });
        },
        checkPageStatus() {
            if(page_status == undefined) {
                window.setTimeout(this.checkPageStatus,5);
            } else {
                // ajout données
                for(let i=0; i<spreadsheet_res.length; i++) {
                    e = spreadsheet_res[i];
                    let marker = L.circleMarker([e.latitude, e.longitude],this.circleMarkerOptions)
                        .bindTooltip(e.lib_com, this.tooltipOptions)
                            .on("mouseover", (e) => {
                            e.target.setStyle(this.clickedMarker.options)
                        }).on("mouseout",(e) => {
                            e.target.setStyle(this.circleMarkerOptions)
                        }).on("click", (e) => {
                            this.onClick(e.sourceTarget.content)
                        });
                    marker.content = e;
                    marker.addTo(this.pointsLayer)
                };

                setTimeout(() => {
                    this.sidebar.open('home');
                }, 150);
            };
        },
        loadDepGeom() {
            promises = [];
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
                this.geom_dep = res[0]
                this.geom_reg = res[1]

                if(map) {
                    cercles_drom = new L.GeoJSON(res[2], {
                        interactive:false,
                        style: {
                            fillOpacity:0,
                            weight:1,
                            color:'white'
                        }
                    }).addTo(map);

                    const labelGeom = res[3]

                    geom_dep = new L.GeoJSON(res[0], this.geojson.options).addTo(map);

                    geom_reg = new L.GeoJSON(res[1], {
                        interactive:false,
                        style: {
                            fillOpacity:0,
                            weight:1.25,
                            color:'white'
                        }
                    }).addTo(this.backgroundLayer)

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
                      }).addTo(this.labelLayer);

            
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

                    //   map.on('zoomend', function() {
                    //     let zoom = map.getZoom();
            
                    //     switch (true) {
                    //       case zoom < 8 :
                    //         labelDep.removeFrom(this.labelLayer)
                    //         break;
                    //       case zoom >= 8 && zoom < 9:
                    //         labelDep.addTo(this.labelLayer);
                    //         break;
                    //     }
                    //   });
                    };
            }).catch((err) => {
                console.log(err);
              });;
        },
        init() {
            Papa.parse(data_url, {
                download: true,
                header: true,
                complete: (results) => this.joinDataOnGeom(results.data)
            });
        },
        joinDataOnGeom(res) {
            fetch("data/geom_com2020.geojson")
            .then(res => res.json())
            .then(com_geom => {
                com_geom = com_geom.features;            
                // 1/ filtre
                com_geom = com_geom.filter(e => {
                    if(res.filter(f => f.insee_com == e.properties.insee_com).length >0) {
                        return e
                    }
                });
                // 2 jointure
                com_geom.forEach(e => {
                    res.forEach(d => {
                        if(e.properties.insee_com == d.insee_com) {
                            for (var key of Object.keys(d)) {
                                e.properties[key] = d[key]
                            }
                        }
                    })
                });
                // 3 tableau final
                com_geom.forEach(e => spreadsheet_res.push(e.properties))
                sessionStorage.setItem("session_data", JSON.stringify(spreadsheet_res))
                page_status = "loaded";
            });
        }
    },
}



// ****************************************************************************
// ****************************************************************************


// instance vue
const vm = new Vue({
    el: '#app',
    components: {
        'leaflet-map': MapTemplate,
        'loading':Loading
    },
    data() {
        return {
            loaded:page_status
        }
    },
    methods: {

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
