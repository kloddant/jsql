# jsql
A javascript, client-only MySQL database-equivalent framework for working with data in memory.

##Including

    <script src="jsql.js"></script>

##Instantiation

    var exampledatabase = new Database();
    
##CREATE TABLE

    exampledatabase.create_table('exampletable', ['id', 'name']);

##INSERT

    exampledatabase.insert({"id":"1", "name":"Bob"}, 'exampletable');

##UPDATE

    exampledatabase.update({"id":"2", "name":"Tony"}, 'exampletable', 'id == 1');

##DELETE

    exampledatabase.delete('exampletable', 'id == 1');

##SELECT

    exampledatabase.select(["id"], 'exampletable', 'id == 1');
