export namespace main {
	
	export class AudioFile {
	    path: string;
	    title: string;
	    artist: string;
	    coverBase64: string;
	
	    static createFrom(source: any = {}) {
	        return new AudioFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.title = source["title"];
	        this.artist = source["artist"];
	        this.coverBase64 = source["coverBase64"];
	    }
	}
	export class Playlist {
	    name: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new Playlist(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	    }
	}

}

