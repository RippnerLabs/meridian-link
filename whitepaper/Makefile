.PHONY: all clean

all:
	pdflatex -interaction=nonstopmode whitepaper.tex > /dev/null 2>&1 && pdflatex -interaction=nonstopmode whitepaper.tex 2>&1 | tail -5 && open whitepaper.pdf

clean:
	rm -f *.aux *.log *.out *.toc *.pdf