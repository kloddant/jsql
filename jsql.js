function intersect(array1, array2) {
	return array1.filter(function(n) {
	    return array2.indexOf(n) != -1;
	});
}

function subset(subarray, superarray) {
	return subarray.reduce(function(o, k) { o[k] = superarray[k]; return o; }, {});
}

function transpose(array) {
	var i = 0;
	var dict = {};
	for (i = 0; i < array.length; i++) {
		for (var key in array[i]) {
		   if (array[i].hasOwnProperty(key)) {
		   		if (i == 0) {
		   			dict[key] = [];
		   		}
		   		dict[key].push(array[i][key]);
		   }
		}
	}
	return dict;
}

function exit(error) {
	throw new Error(error);
}

class Database {

	constructor() {
		this.tables = {};
	}

	insert(json, table) {
		var table = this.tables[table];
		table.insert(json);
	}

	update(fields, table, where) {
		var table = this.tables[table];
		table.update(fields, where);
	}

	delete(table, where) {
		var table = this.tables[table];
		table.delete(where);
	}

	select(fields, tables, where) {
		var i = 0;
		var queryset = [];
		for (i = 0; i < tables.length; i++) {
			var name = tables[i]['name'];
			var on = tables[i]['on'];
			var table = this.tables[name];
			var condition = on.replace(/`(\w+)`\.`(\w+)`/g, "this.tables['$1']['$2']");
			if (eval(condition)) {
				queryset = queryset.concat(table.select(fields, where));
			}
		}
		return queryset;
	}

	create_table(name, structure) {
		this.tables[name] = new Table(name, structure);
	}

}

class Table {

	constructor(name, structure) {
		this.name = name;
		this.structure = structure;
		this.data = [];
		this.indices = {};
	}

	index() {
		this.indices = transpose(this.data);
	}

	insert(json) {
		var keys = Object.keys(json);
		var structure = this.structure;
		var indices = this.indices;
		keys.forEach(function(key) {
			if (!structure[key].validate(json[key])) {
				throw new Error("Error: Invalid data type.");
			}
			if (structure[key].unique) {
				if (indices && indices.hasOwnProperty(key) && indices[key].indexOf(json[key]) > -1) {
					throw new Error("Error: '"+key+"' field is unique.  Cannot add duplicate value "+json[key]);
				}
			}
		});
		this.data.push(json);
		this.index();
	}

	update(fields, where) {
		this.indexed_update(fields, where);
	}

	delete(where) {
		this.indexed_delete(where);
	}

	select(fields, where) {
		return this.indexed_select(fields, where);
	}

	indexed_update(fields, where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			condition = condition.replace(/`(\w+)`/g, "this.indices['$1'][i]");
			if (eval(condition)) {
				Object.assign(this.data[i], fields);
			}
		}
		this.index();
	}

	indexed_delete(where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			condition = condition.replace(/`(\w+)`/g, "this.indices['$1'][i]");
			if (eval(condition)) {
				this.data.splice(i, 1);
			}
		}
		this.index();
	}

	indexed_select(fields, where) {
		var i = 0;
		var results = [];
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			condition = condition.replace(/`(\w+)`/g, "this.indices['$1'][i]");
			if (eval(condition)) {
				var sub = {};
				var ii = 0;
				for (ii = 0; ii < fields.length; ii++) {
					sub[fields[ii]] = this.indices[fields[ii]][i];
				}
				results.push(sub);
			}
		}
		return results;
	}

	full_scan_update(fields, where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace("`"+key+"`", "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				Object.assign(this.data[i], fields);
			}
		}
		this.index();
	}

	full_scan_delete(where) {
		var i = 0;
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace("`"+key+"`", "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				this.data.splice(i, 1);
			}
		}
		this.index();
	}

	full_scan_select(fields, where) {
		var i = 0;
		var results = [];
		for (i = 0; i < this.data.length; i++) {
			var condition = where;
			var keys = Object.keys(this.data[i]);
			keys.forEach(function(key) {
				condition = condition.replace("`"+key+"`", "this.data[i]['"+key+"']");
			});
			if (eval(condition)) {
				if (intersect(fields, keys)) {
					var sub = subset(fields, this.data[i]);
					results.push(sub);
				}
			}
		}
		return results;
	}

}

class Field {

	constructor(max_length = false, unique=false) {
		if (max_length) {
			this.max_length = max_length;
		} 
		if (unique) {
			this.unique = true;
		}
	}

	validate(value) {
		if (value.length > this.max_length) {
			throw new Error("Error: '"+value+"' is greater than '"+this.max_length+"' characters.");
		}
		return true;
	}

}

class CharField extends Field {

	constructor() {
		super();
	}

	validate(value) {
		super.validate(value);
		if (typeof value !== 'string') {
			throw new Error("Error: '"+value+"' is not a string.");
		}
		return true;
	}

}

class IntegerField extends Field {

	constructor(max_length=false, unique=false) {
		super(max_length=max_length, unique=unique);
	}

	validate(value) {
		super.validate(value);
		if (!Number.isInteger(value)) {
			throw new Error("Error: '"+value+"' is not an integer.");
		}
		return true;
	}

}

class EmailField extends CharField {

	constructor() {
		super();
	}

	validate(value) {
		super.validate(value);
		var re = /^.+@.+$/;
		if (!re.test(value)) {
			throw new Error("Error: '"+value+"' is not an email address.");
		}
		return true;
	}

}

class UrlField extends CharField {

	constructor() {
		super();
	}

	validate(value) {
		super.validate(value);
		var re = /^https?:\/\/.+\..+$/;
		if (!re.test(value)) {
			throw new Error("Error: '"+value+"' is not a url.");
		}
		return true;
	}

}












var test = new Database();
test.create_table('test', {
		'id': new IntegerField(max_length=false, unique=true),
		'name': new CharField(),
	}
);
test.insert({"id": 1, "name":"Bob"}, 'test');
test.insert({"id": 1, "name":"Sam"}, 'test');
test.update({"id": 2, "name":"Tony"}, 'test', '`id` == 1');
test2 = test.select(["id"], [{'name':'test', 'on':'true'}], '`id` == 2');
console.log(test2);
