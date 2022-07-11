/*
    Carte interactive des territoires en commun et territoire d'engagement
    Hassen Chougar / ANCT service cartographie
    dependances : Leaflet v1.0.7, vue v2.6.12, vue-router v4.0.5, bootstrap v4.6.0, papaparse v5.3.1

*/

const dataUrl = '';



// ****************************************************************************
let SearchBar = {
    template: `
            <div id="search-bar-container">
                <div class="input-group">
                    <span class="input-group-prepend">
                        <div class="input-group-text bg-white border-right-0">
                            <i class="fal fa-search form-control-icon"></i>
                        </div>
                    </span>
                    <input ref = "input" class="form-control shadow-none py-2 border-right-0 border-left-0"
                            id="search-field" type="search"
                            placeholder="Saisissez un nom de territoire" 
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
            this.isOpen = !this.isOpen;
            this.inputAdress = this.suggestionsList[this.index].lib_com;
            
            suggestion = this.suggestionsList[this.index];
            
            this.suggestionsList = [];
            this.index = -1;
            
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
    mounted() {
        document.addEventListener("click", this.handleClickOutside);
    },
    destroyed() {
        document.removeEventListener("click", this.handleClickOutside);
    }

};

// ****************************************************************************

// Loading screen
const LoadingScreen = {
    template:`
        <div>
            <div class="w-100 h-100 d-flex flex-column justify-content-center align-items-center" id = "loading">
                <div class="row">
                    <div class="spinner-border" role="status">
                        <p class="sr-only">Loading...</p>
                    </div>
                </div>
                <div class="row">
                    <p>Chargement des données en cours ...</p>
                </div>
            </div>
        </div>
    `
};

// ****************************************************************************

const Sidebar = {
    template: ` 
    <div id="sidebar" class="leaflet-sidebar collapsed">
        <!-- nav tabs -->
        <div class="leaflet-sidebar-tabs">
            <!-- top aligned tabs -->
            <ul role="tablist">
                <li><a href="#home" role="tab"><i class="fal fa-home"></i></a></li>
                <li><a href="#download" role="tab"><i class="fal fa-download"></i></a></li>
                <li><a href="#a-propos" role="tab"><i class="fal fa-question"></i></a></li>
            </ul>
            <!-- bottom aligned tabs -->
            <ul role="tablist">
            </ul>
        </div>
        <!-- panel content -->
        <div class="leaflet-sidebar-content">
            <div class="leaflet-sidebar-pane" id="home">
                <div class="leaflet-sidebar-header">
                    <span>Accueil</span>
                    <span class="leaflet-sidebar-close">
                        <i class="fal fa-step-backward"></i>
                    </span>
                </div>
                <div v-if="!show" class="sidebar-body">
                    <div class="sidebar-header">
                        <img src="img/pvd_logo.png" id="logo-programme"></img>
                    </div><br>
                    <search-group @searchResult="getResult"></search-group><br>
                    <text-intro></text-intro>
                </div>
                <div>
                    <card :pvd="cardContent" v-if="show"></card><br>
                    <button id="back-btn" type="button" class="btn btn-primary" v-if="show" @click="onClick">
                        <i class="fa fa-chevron-left"></i>
                        Retour à l'accueil
                    </button>
                </div>
            </div>
            <div class="leaflet-sidebar-pane" id="download">
                <div class="leaflet-sidebar-header">
                    <span>Téléchargement</span>
                    <span class="leaflet-sidebar-close">
                        <i class="fal fa-step-backward"></i>
                    </span>
                </div>
                <h5 style="font-family:'Marianne-Extrabold'">
                    Télécharger les données
                </h5>
                <p>
                    La liste des communes bénéficiaires est disponible sur 
                    <a href='https://www.data.gouv.fr/fr/datasets/programme-petites-villes-de-demain/' target="_blank">data.gouv.fr</a>.
                </p>
                <h5 style="font-family:'Marianne-Extrabold'">
                    Télécharger les cartes
                </h5>
                <p>
                    L'ensemble des cartes régionales et départementales est disponible sur la 
                    <a href='https://cartotheque.anct.gouv.fr/cartes?filters%5Bquery%5D=pvd&current_page=1&category=&page_size=20/' target="_blank">cartothèque de l'ANCT</a>.
                </p>
            </div>
            <div class="leaflet-sidebar-pane" id="a-propos">
                <h2 class="leaflet-sidebar-header">
                    À propos
                    <span class="leaflet-sidebar-close">
                        <i class="fas fa-step-backward"></i>
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
    props: ['fromParent'],
    data() {
        return {
            show:false,
            cardContent:null,
        }
    },
    watch: {
        fromParent() {
            this.cardContent = this.fromParent;
            if(this.fromParent) {
                this.show = true;
            }
        },
    },
    computed: {
        filteredList() {
            // return this.fromParent.slice(0, this.nbResults)
        }
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
